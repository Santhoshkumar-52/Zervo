const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

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

module.exports = {
  getBranches,
};
