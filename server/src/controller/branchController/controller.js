const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const { updateBranchSchema, formatZodError } = require("./schema");

// Group 1 is the owner (see ROLES in staffController/schema.js). tokenVerify
// reads the group id from the database and puts it on req.user.role, so it is
// not taken from the token payload.
const OWNER_GROUP_ID = 1;

// Columns returned for a branch.
const BRANCH_COLUMNS = [
  "id",
  "name",
  "code",
  "logo",
  "attend_background",
  "address",
  "phone",
  "currency",
  "subbill_url",
  "receipt_url",
  "is_active",
  "created_at",
  "updated_at",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const findBranch = (id) =>
  db("branches").select(BRANCH_COLUMNS).where({ id }).first();

// GET /api/branch
// Every branch, active and inactive, ordered by name (is_active tells them
// apart). Not scoped to the user's branch: only a user whose group id is 1
// (the owner) may read the whole list, everyone else gets 403.
// -> { branches: [{ id, name, code, logo, attend_background, address, phone,
//                   currency, subbill_url, receipt_url, is_active,
//                   created_at, updated_at }] }
const getBranches = async (req, res) => {
  try {
    if (req.user?.role !== OWNER_GROUP_ID) {
      return errorResponse(
        res,
        "You do not have permission to view all branches. Contact Admin",
        403,
      );
    }

    const branches = await db("branches")
      .select(BRANCH_COLUMNS)
      .orderBy("name", "asc");

    return successResponse(res, { branches }, "Branches fetched successfully");
  } catch (error) {
    console.error("Error fetching branches:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/branch/:id   (owner only)
// body (any of): { name, code, logo, attend_background, address, phone,
//                  currency, subbill_url, receipt_url, is_active }
// -> { branch }
const updateBranch = async (req, res) => {
  try {
    if (req.user?.role !== OWNER_GROUP_ID) {
      return errorResponse(
        res,
        "You do not have permission to edit branches. Contact Admin",
        403,
      );
    }

    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid branch id", 400);

    const parsed = updateBranchSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const changes = { ...parsed.data };

    const existing = await findBranch(id);

    if (!existing) return errorResponse(res, "Branch not found", 404);

    // Deactivating the branch you are logged into would lock you out of it.
    if (changes.is_active === false && id === Number(req.user.branchId)) {
      return errorResponse(res, "You cannot deactivate your own branch", 400, [
        { field: "is_active", message: "Your own branch must stay active" },
      ]);
    }

    // Empty string clears an optional column.
    if (changes.address !== undefined) {
      changes.address = changes.address || null;
    }

    if (changes.phone !== undefined) {
      changes.phone = changes.phone || null;
    }

    await db("branches")
      .where({ id })
      .update({ ...changes, updated_at: db.fn.now() });

    const branch = await findBranch(id);

    return successResponse(res, { branch }, "Branch updated successfully");
  } catch (error) {
    // Unique index on branches.code
    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(res, "A branch with this code already exists", 409, [
        { field: "code", message: "Branch code is already in use" },
      ]);
    }

    console.error("Error updating branch:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getBranches,
  updateBranch,
};
