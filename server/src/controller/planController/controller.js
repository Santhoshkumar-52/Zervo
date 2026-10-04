const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

// Columns returned for a plan (list + single plan).
const PLAN_COLUMNS = [
  "plans.id",
  "plans.branch_id",
  "plans.name",
  "plans.duration_days",
  "plans.price_minor",
  "plans.max_freeze_days",
  "plans.is_active",
  "plans.created_at",
  "plans.updated_at",

  "branches.name as branch_name",
  "branches.is_active as branch_is_active",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Plans scoped to the logged-in user's branch. Soft-deleted rows are hidden.
const planQuery = (branchId) =>
  db("plans")
    .join("branches", "plans.branch_id", "branches.id")
    .where("plans.branch_id", branchId)
    .whereNull("plans.deleted_at");

const findPlan = (id, branchId) =>
  planQuery(branchId).where("plans.id", id).select(PLAN_COLUMNS).first();

// GET /api/plan?page&limit&search&planActive
const getPlans = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const planActive = req.query.planActive;

    const baseQuery = planQuery(branchId);

    if (search) {
      baseQuery.where("plans.name", "like", `%${search}%`);
    }

    if (planActive !== undefined) {
      baseQuery.where("plans.is_active", planActive === "true");
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("plans.id as total");

    const plans = await baseQuery
      .clone()
      .select(PLAN_COLUMNS)
      .orderBy("plans.name", "asc")
      .orderBy("plans.id", "desc")
      .limit(limit)
      .offset(offset);

    const totalPlans = Number(total);
    const totalPages = Math.ceil(totalPlans / limit);

    return successResponse(
      res,
      {
        plans,
        pagination: {
          page,
          limit,
          total: totalPlans,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Plans fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching plans:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/plan/:id
const getPlanById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid plan id", 400);

    const plan = await findPlan(id, req.user.branchId);

    if (!plan) return errorResponse(res, "Plan not found", 404);

    return successResponse(res, { plan }, "Plan fetched successfully");
  } catch (error) {
    console.error("Error fetching plan:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getPlans,
  getPlanById,
};
