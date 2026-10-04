const db = require("../../config/knexfile");
const { hashPassword } = require("../../utils/hashhelper");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  ROLES,
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
  formatZodError,
} = require("./schema");

// Staff = rows in the `users` table. Never select `password`.
const STAFF_COLUMNS = [
  "users.id",
  "users.user_id",
  "users.branch_id",
  "users.full_name",
  "users.email",
  "users.role",
  "users.avatar_url",
  "users.is_active",
  "users.created_at",
  "users.created_by",
  "users.updated_at",
  "users.updated_by",
  "branches.name as branch_name",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Staff scoped to the logged-in user's branch. Soft-deleted rows are hidden.
const staffQuery = (branchId) =>
  db("users")
    .join("branches", "users.branch_id", "branches.id")
    .where("users.branch_id", branchId)
    .whereNull("users.deleted_at");

const findStaff = (id, branchId) =>
  staffQuery(branchId).where("users.id", id).select(STAFF_COLUMNS).first();

// Returns a response for duplicate email / user_id, otherwise null.
const duplicateResponse = (res, error) => {
  if (error.code !== "ER_DUP_ENTRY") return null;

  const message = error.sqlMessage || "";

  if (message.includes("email")) {
    return errorResponse(res, "Email is already in use", 409);
  }

  if (message.includes("user_id")) {
    return errorResponse(res, "User ID is already in use", 409);
  }

  return errorResponse(res, "Duplicate value", 409);
};

// GET /api/staff?page&limit&search&role&isActive
const getStaffList = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const { role, isActive } = req.query;

    if (role !== undefined && !ROLES.includes(role)) {
      return errorResponse(res, `role must be one of: ${ROLES.join(", ")}`, 400);
    }

    const baseQuery = staffQuery(branchId);

    if (search) {
      baseQuery.where((query) => {
        query
          .where("users.full_name", "like", `%${search}%`)
          .orWhere("users.email", "like", `%${search}%`)
          .orWhere("users.user_id", "like", `%${search}%`);
      });
    }

    if (role !== undefined) {
      baseQuery.where("users.role", role);
    }

    if (isActive !== undefined) {
      baseQuery.where("users.is_active", isActive === "true");
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .count("users.id as total");

    const staff = await baseQuery
      .clone()
      .select(STAFF_COLUMNS)
      .orderBy("users.created_at", "desc")
      .orderBy("users.id", "desc")
      .limit(limit)
      .offset(offset);

    const totalStaff = Number(total);
    const totalPages = Math.ceil(totalStaff / limit);

    return successResponse(
      res,
      {
        staff,
        pagination: {
          page,
          limit,
          total: totalStaff,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Staff fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching staff:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/staff/:id   (used to load the edit form)
const getStaffById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid staff id", 400);

    const staff = await findStaff(id, req.user.branchId);

    if (!staff) return errorResponse(res, "Staff not found", 404);

    return successResponse(res, { staff }, "Staff fetched successfully");
  } catch (error) {
    console.error("Error fetching staff member:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/staff
// user_id comes from the request body; branch_id is the logged-in user's branch.
const createStaff = async (req, res) => {
  try {
    const parsed = createStaffSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const data = parsed.data;

    const [insertedId] = await db("users").insert({
      user_id: data.user_id,
      branch_id: req.user.branchId,
      full_name: data.full_name,
      email: data.email,
      password: await hashPassword(data.password),
      role: data.role,
      is_active: data.is_active,
      avatar_url: data.avatar_url ?? null,
      created_by: req.user.userId, // the logged-in user who created this staff
      updated_by: req.user.userId,
    });

    const staff = await findStaff(insertedId, req.user.branchId);

    return successResponse(res, { staff }, "Staff created successfully", 201);
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error creating staff:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH|PUT /api/staff/:id  (matched on id AND the logged-in user's branch_id)
const updateStaff = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid staff id", 400);

    const parsed = updateStaffSchema.safeParse(req.body);

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

    const existing = await findStaff(id, branchId);

    if (!existing) return errorResponse(res, "Staff not found", 404);

    // Don't let someone lock themselves out.
    if (id === userId) {
      if (changes.is_active === false) {
        return errorResponse(res, "You cannot deactivate your own account", 400);
      }

      if (changes.role && changes.role !== existing.role) {
        return errorResponse(res, "You cannot change your own role", 400);
      }
    }

    if (changes.password) {
      changes.password = await hashPassword(changes.password);
    }

    await db("users")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      // updated_at is set by the DB (ON UPDATE CURRENT_TIMESTAMP).
      .update({ ...changes, updated_by: userId });

    const staff = await findStaff(id, branchId);

    return successResponse(res, { staff }, "Staff updated successfully");
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error updating staff:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/staff/:id/status   body: { is_active: boolean }
const updateStaffStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid staff id", 400);

    const parsed = updateStaffStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;
    const { is_active: isActive } = parsed.data;

    // Don't let someone lock themselves out.
    if (id === userId && isActive === false) {
      return errorResponse(res, "You cannot deactivate your own account", 400);
    }

    const existing = await findStaff(id, branchId);

    if (!existing) return errorResponse(res, "Staff not found", 404);

    await db("users")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({ is_active: isActive, updated_by: userId });

    // A deactivated account should not keep working sessions.
    if (!isActive) {
      await db("user_tokens").where({ user_id: id }).update({ is_revoked: true });
    }

    const staff = await findStaff(id, branchId);

    return successResponse(
      res,
      { staff },
      `Staff marked as ${isActive ? "active" : "inactive"}`,
    );
  } catch (error) {
    console.error("Error updating staff status:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// DELETE /api/staff/:id  (soft delete, matched on id AND the logged-in user's branch_id)
const deleteStaff = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid staff id", 400);

    const { branchId, userId } = req.user;

    if (id === userId) {
      return errorResponse(res, "You cannot delete your own account", 400);
    }

    const existing = await findStaff(id, branchId);

    if (!existing) return errorResponse(res, "Staff not found", 404);

    // Soft delete: keep the row, record who/when, and kill their sessions.
    await db.transaction(async (trx) => {
      await trx("users")
        .where({ id, branch_id: branchId })
        .whereNull("deleted_at")
        .update({
          deleted_at: db.fn.now(),
          deleted_by: userId,
          is_active: false,
          updated_by: userId,
        });

      await trx("user_tokens").where({ user_id: id }).update({ is_revoked: true });
    });

    return successResponse(res, { id }, "Staff deleted successfully");
  } catch (error) {
    console.error("Error deleting staff:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getStaffList,
  getStaffById,
  createStaff,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
};
