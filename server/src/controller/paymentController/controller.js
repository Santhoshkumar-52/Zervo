const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

// GET /api/payment
// The active payment methods of the logged-in user's branch (Cash, Card, UPI...),
// for a dropdown. Soft-deleted and inactive rows are left out. There is no
// paging because a branch only has a handful of methods.
const getPayments = async (req, res) => {
  try {
    const { branchId } = req.user;

    const payments = await db("payments")
      .where({ branch_id: branchId, is_active: true })
      .whereNull("deleted_at")
      .select("id", "branch_id", "payment_name", "is_active")
      .orderBy("payment_name", "asc")
      .orderBy("id", "asc");

    return successResponse(
      res,
      { payments },
      "Payments fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching payments:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getPayments,
};