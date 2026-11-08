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

// Access check shared by every branch handler.
//
//   401  no verified user on the request. tokenVerify (applied to /api/branch
//        in routes/index.js) sets req.user only after the token's signature,
//        expiry and database session all check out, so a missing req.user means
//        the request was not authenticated.
//   403  authenticated, but the user's group id is not 1 (owner).
//
// Returns true when the request may continue. Otherwise it has already sent
// the error response and the handler must return.
const ensureOwner = (req, res, forbiddenMessage) => {
  if (!req.user?.userId) {
    errorResponse(res, "Authentication required", 401, {
      code: "TOKEN_INVALID",
    });

    return false;
  }

  if (Number(req.user.role) !== OWNER_GROUP_ID) {
    errorResponse(res, forbiddenMessage, 403);

    return false;
  }

  return true;
};

// GET /api/branch
// Every branch, active and inactive, ordered by name (is_active tells them
// apart). Not scoped to the user's branch: only a user whose group id is 1
// (the owner) may read the whole list, everyone else gets 403.
// -> { branches: [{ id, name, code, logo, attend_background, address, phone,
//                   currency, subbill_url, receipt_url, is_active,
//                   created_at, updated_at }] }
const getBranches = async (req, res) => {
  try {
    if (
      !ensureOwner(
        req,
        res,
        "You do not have permission to view all branches. Contact Admin",
      )
    ) {
      return;
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

// PATCH /api/branch/:id   (verified token + owner, group id 1, only)
// body (any of): { name, code, logo, attend_background, address, phone,
//                  currency, subbill_url, receipt_url, is_active }
// -> { branch }
const updateBranch = async (req, res) => {
  try {
    if (
      !ensureOwner(
        req,
        res,
        "You do not have permission to edit branches. Contact Admin",
      )
    ) {
      return;
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
