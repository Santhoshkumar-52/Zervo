const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const { ROLES } = require("../staffController/schema");
const {
  createGroupSchema,
  updateGroupSchema,
  updateGroupStatusSchema,
  formatZodError,
} = require("./schema");

// Groups are the staff roles (users.group_id). They are shared by every
// branch, so unlike taxes or plans they are not scoped to a branch.
//
// The built-in roles (ROLES) are used by name and id all over the app
// (authorizeRoles, the staff API), so they cannot be renamed, deactivated or
// deleted here.

// Columns returned for a group (list + single group).
const GROUP_COLUMNS = [
  "groups.id",
  "groups.name",
  "groups.description",
  "groups.is_active",
  "groups.created_at",
  "groups.updated_at",
  // Staff (not deleted) currently in this group.
  db.raw(
    "(SELECT COUNT(*) FROM users WHERE users.group_id = groups.id AND users.deleted_at IS NULL) AS user_count",
  ),
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isBuiltIn = (group) => ROLES.includes(group.name);

// Soft-deleted rows are hidden.
const groupQuery = () => db("groups").whereNull("groups.deleted_at");

const findGroup = (id) =>
  groupQuery().where("groups.id", id).select(GROUP_COLUMNS).first();

// Returns a response for a duplicate value, otherwise null.
// Unique index: name. Soft-deleted rows still hold their name.
const duplicateResponse = (res, error) => {
  if (error.code !== "ER_DUP_ENTRY") return null;

  return errorResponse(res, "A group with this name already exists", 409, [
    { field: "name", message: "Group name is already in use" },
  ]);
};

// Why a group may not be deactivated or deleted, or null when it may.
const getLockReason = (group) => {
  if (isBuiltIn(group)) {
    return "Built-in groups cannot be deactivated or deleted";
  }

  if (Number(group.user_count) > 0) {
    return "Move the staff in this group to another group first";
  }

  return null;
};

// GET /api/group?page&limit&search&groupActive
const getGroups = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const groupActive = req.query.groupActive;

    const baseQuery = groupQuery();

    if (search) {
      baseQuery.where((query) => {
        query
          .where("groups.name", "like", `%${search}%`)
          .orWhere("groups.description", "like", `%${search}%`);
      });
    }

    if (groupActive !== undefined) {
      baseQuery.where("groups.is_active", groupActive === "true");
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("groups.id as total");

    const groups = await baseQuery
      .clone()
      .select(GROUP_COLUMNS)
      .orderBy("groups.id", "asc")
      .limit(limit)
      .offset(offset);

    const totalGroups = Number(total);
    const totalPages = Math.ceil(totalGroups / limit);

    return successResponse(
      res,
      {
        groups,
        pagination: {
          page,
          limit,
          total: totalGroups,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Groups fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching groups:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/group/:id
const getGroupById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid group id", 400);

    const group = await findGroup(id);

    if (!group) return errorResponse(res, "Group not found", 404);

    return successResponse(res, { group }, "Group fetched successfully");
  } catch (error) {
    console.error("Error fetching group:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/group  (created_by comes from the logged-in user)
const createGroup = async (req, res) => {
  try {
    const parsed = createGroupSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { userId } = req.user;
    const data = parsed.data;

    const [insertedId] = await db("groups").insert({
      name: data.name,
      description: data.description || null,
      is_active: data.is_active,
      created_by: userId,
      updated_by: userId,
    });

    const group = await findGroup(insertedId);

    return successResponse(res, { group }, "Group created successfully", 201);
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error creating group:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/group/:id
const updateGroup = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid group id", 400);

    const parsed = updateGroupSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { userId } = req.user;
    const changes = { ...parsed.data };

    const existing = await findGroup(id);

    if (!existing) return errorResponse(res, "Group not found", 404);

    // A built-in group keeps its name (the app looks roles up by name).
    if (
      isBuiltIn(existing) &&
      changes.name !== undefined &&
      changes.name !== existing.name
    ) {
      return errorResponse(res, "Built-in groups cannot be renamed", 403);
    }

    if (changes.is_active === false && Boolean(existing.is_active)) {
      const reason = getLockReason(existing);

      if (reason) return errorResponse(res, reason, 409);
    }

    if (changes.description !== undefined) {
      changes.description = changes.description || null;
    }

    await db("groups")
      .where({ id })
      .whereNull("deleted_at")
      .update({ ...changes, updated_by: userId, updated_at: db.fn.now() });

    const group = await findGroup(id);

    return successResponse(res, { group }, "Group updated successfully");
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error updating group:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/group/:id/status   body: { is_active: boolean }
const updateGroupStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid group id", 400);

    const parsed = updateGroupStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { userId } = req.user;

    const existing = await findGroup(id);

    if (!existing) return errorResponse(res, "Group not found", 404);

    if (!parsed.data.is_active) {
      const reason = getLockReason(existing);

      if (reason) return errorResponse(res, reason, 409);
    }

    await db("groups").where({ id }).whereNull("deleted_at").update({
      is_active: parsed.data.is_active,
      updated_by: userId,
      updated_at: db.fn.now(),
    });

    const group = await findGroup(id);

    return successResponse(
      res,
      { group },
      `Group marked as ${parsed.data.is_active ? "active" : "inactive"}`,
    );
  } catch (error) {
    console.error("Error updating group status:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// DELETE /api/group/:id  (soft delete)
const deleteGroup = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid group id", 400);

    const { userId } = req.user;

    const existing = await findGroup(id);

    if (!existing) return errorResponse(res, "Group not found", 404);

    const reason = getLockReason(existing);

    if (reason) return errorResponse(res, reason, 409);

    // Soft delete: keep the row, record who/when, and mark inactive.
    await db("groups").where({ id }).whereNull("deleted_at").update({
      deleted_at: db.fn.now(),
      deleted_by: userId,
      is_active: false,
      updated_by: userId,
      updated_at: db.fn.now(),
    });

    return successResponse(res, { id }, "Group deleted successfully");
  } catch (error) {
    console.error("Error deleting group:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupStatus,
  deleteGroup,
};
