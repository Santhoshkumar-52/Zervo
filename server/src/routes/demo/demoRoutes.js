const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

const getDemoUsers = async (req, res) => {
  try {
    const users = await db("users")
      .select(
        "id",
        "full_name",
        "email",
        "group_id",
        "branch_id",
        "is_active",
        "created_at",
      )
      .orderBy("id", "asc");

    return successResponse(
      res,
      {
        users,
        authenticatedUser: req.user,
      },
      "Users fetched successfully",
    );
  } catch (error) {
    console.error("Demo users error:", error);

    return errorResponse(res, "Failed to fetch users", 500);
  }
};

module.exports = {
  getDemoUsers,
};
