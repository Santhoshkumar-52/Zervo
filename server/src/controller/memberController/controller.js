const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  createMemberSchema,
  updateMemberSchema,
  updateMemberStatusSchema,
  formatZodError,
} = require("./schema");

// Columns returned for a member (list + single member).
const MEMBER_COLUMNS = [
  "members.id",
  "members.member_Id",
  db.raw("CONCAT_WS(' ', members.first_name, members.last_name) as member_name"),
  "members.email",
  "members.phone",
  "members.is_active",
  "members.branch_id",
  "members.assigned_trainer_id",
  "members.first_name",
  "members.last_name",
  "members.avatar_url",
  // plain YYYY-MM-DD so the client date input is not shifted by timezone
  db.raw("DATE_FORMAT(members.joined_on, '%Y-%m-%d') as joined_on"),
  db.raw("DATE_FORMAT(members.dob, '%Y-%m-%d') as dob"),

  "branches.name as branch_name",
  "branches.is_active as branch_is_active",

  "users.id as trainer_id",
  "users.full_name as trainer_name",
  "users.email as trainer_email",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Members scoped to the logged-in user's branch. Soft-deleted rows are hidden.
const memberQuery = (branchId) =>
  db("members")
    .join("branches", "members.branch_id", "branches.id")
    .leftJoin("users", "members.assigned_trainer_id", "users.id")
    .where("members.branch_id", branchId)
    .whereNull("members.deleted_at");

const findMember = (id, branchId) =>
  memberQuery(branchId).where("members.id", id).select(MEMBER_COLUMNS).first();

// Returns a response for a duplicate value, otherwise null.
const duplicateResponse = (res, error) => {
  if (error.code !== "ER_DUP_ENTRY") return null;

  const message = error.sqlMessage || "";

  if (message.includes("phone")) {
    return errorResponse(res, "Phone number is already in use", 409);
  }

  if (/member_id/i.test(message)) {
    return errorResponse(res, "Could not assign a member ID, please try again", 409);
  }

  return errorResponse(res, "Duplicate value", 409);
};

// A trainer must be an active, non-deleted trainer of the same branch.
const findAvailableTrainer = (trainerId, branchId) =>
  db("users")
    .where({
      id: trainerId,
      branch_id: branchId,
      role: "trainer",
      is_active: true,
    })
    .whereNull("deleted_at")
    .first("id");

const trainerNotAvailable = (res) =>
  errorResponse(res, "Selected trainer is not available", 400, [
    {
      field: "assigned_trainer_id",
      message: "Trainer not found in this branch or is inactive",
    },
  ]);

const MEMBER_ID_RETRIES = 3;

// GET /api/member?page&limit&search&memberActive&branchActive
const getmembers = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const memberActive = req.query.memberActive;
    const branchActive = req.query.branchActive;

    const baseQuery = memberQuery(branchId);

    if (search) {
      baseQuery.where((query) => {
        query
          .whereRaw(
            "CONCAT_WS(' ', members.first_name, members.last_name) LIKE ?",
            [`%${search}%`],
          )
          .orWhere("members.email", "like", `%${search}%`)
          .orWhere("members.phone", "like", `%${search}%`)
          .orWhere("users.full_name", "like", `%${search}%`);
      });
    }

    if (memberActive !== undefined) {
      baseQuery.where("members.is_active", memberActive === "true");
    }

    if (branchActive !== undefined) {
      baseQuery.where("branches.is_active", branchActive === "true");
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("members.id as total");

    const members = await baseQuery
      .clone()
      .select(MEMBER_COLUMNS)
      .orderBy("members.joined_on", "desc")
      .orderBy("members.id", "desc")
      .limit(limit)
      .offset(offset);

    const totalMembers = Number(total);
    const totalPages = Math.ceil(totalMembers / limit);

    return successResponse(
      res,
      {
        members,
        pagination: {
          page,
          limit,
          total: totalMembers,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Members fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching members:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/member/:id   (used to load the edit form)
const getMemberById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid member id", 400);

    const member = await findMember(id, req.user.branchId);

    if (!member) return errorResponse(res, "Member not found", 404);

    return successResponse(res, { member }, "Member fetched successfully");
  } catch (error) {
    console.error("Error fetching member:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/member
// member_Id is generated (max + 1); branch_id and created_by come from the logged-in user.
const createMember = async (req, res) => {
  try {
    const parsed = createMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;
    const data = parsed.data;

    if (data.assigned_trainer_id) {
      const trainer = await findAvailableTrainer(
        data.assigned_trainer_id,
        branchId,
      );

      if (!trainer) return trainerNotAvailable(res);
    }

    let insertedId = null;

    // Two people adding a member at the same moment can pick the same
    // member_Id; the unique index rejects one of them, so retry with a fresh id.
    for (let attempt = 1; attempt <= MEMBER_ID_RETRIES; attempt += 1) {
      try {
        insertedId = await db.transaction(async (trx) => {
          const [{ maxId }] = await trx("members").max("member_Id as maxId");

          const [id] = await trx("members").insert({
            member_Id: Number(maxId || 0) + 1,
            branch_id: branchId,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            email: data.email ?? null,
            joined_on: data.joined_on,
            assigned_trainer_id: data.assigned_trainer_id ?? null,
            is_active: data.is_active,
            created_by: userId,
            updated_by: userId,
          });

          return id;
        });

        break;
      } catch (error) {
        const idClash =
          error.code === "ER_DUP_ENTRY" &&
          /member_id/i.test(error.sqlMessage || "");

        if (!idClash || attempt === MEMBER_ID_RETRIES) throw error;
      }
    }

    const member = await findMember(insertedId, branchId);

    return successResponse(res, { member }, "Member created successfully", 201);
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error creating member:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/member/:id  (matched on id AND the logged-in user's branch_id)
const updateMember = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid member id", 400);

    const parsed = updateMemberSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;
    const changes = { ...parsed.data };

    const existing = await findMember(id, branchId);

    if (!existing) return errorResponse(res, "Member not found", 404);

    // Only check the trainer when it actually changes, so a member whose
    // current trainer was later deactivated can still be edited.
    if (
      changes.assigned_trainer_id !== undefined &&
      changes.assigned_trainer_id !== null &&
      changes.assigned_trainer_id !== existing.assigned_trainer_id
    ) {
      const trainer = await findAvailableTrainer(
        changes.assigned_trainer_id,
        branchId,
      );

      if (!trainer) return trainerNotAvailable(res);
    }

    await db("members")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      // updated_at is set by the DB (ON UPDATE CURRENT_TIMESTAMP).
      .update({ ...changes, updated_by: userId });

    const member = await findMember(id, branchId);

    return successResponse(res, { member }, "Member updated successfully");
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error updating member:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/member/:id/status   body: { is_active: boolean }
const updateMemberStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid member id", 400);

    const parsed = updateMemberStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;

    const existing = await findMember(id, branchId);

    if (!existing) return errorResponse(res, "Member not found", 404);

    await db("members")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({ is_active: parsed.data.is_active, updated_by: userId });

    const member = await findMember(id, branchId);

    return successResponse(
      res,
      { member },
      `Member marked as ${parsed.data.is_active ? "active" : "inactive"}`,
    );
  } catch (error) {
    console.error("Error updating member status:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// DELETE /api/member/:id  (soft delete, matched on id AND the logged-in user's branch_id)
const deleteMember = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid member id", 400);

    const { branchId, userId } = req.user;

    const existing = await findMember(id, branchId);

    if (!existing) return errorResponse(res, "Member not found", 404);

    // Soft delete: keep the row, record who/when, and mark inactive.
    await db("members")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        deleted_at: db.fn.now(),
        deleted_by: userId,
        is_active: false,
        updated_by: userId,
      });

    return successResponse(res, { id }, "Member deleted successfully");
  } catch (error) {
    console.error("Error deleting member:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getmembers,
  getMemberById,
  createMember,
  updateMember,
  updateMemberStatus,
  deleteMember,
};
