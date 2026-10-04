const { z } = require("zod");

const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  checkPlanRules,
  createPlanSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
  formatZodError,
} = require("./schema");

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

// Returns a response for a duplicate value, otherwise null.
// Unique index: (branch_id, name). Soft-deleted rows still hold their name.
const duplicateResponse = (res, error) => {
  if (error.code !== "ER_DUP_ENTRY") return null;

  return errorResponse(res, "A plan with this name already exists", 409, [
    { field: "name", message: "Plan name is already in use" },
  ]);
};

// Runs the cross-field rule (freeze days <= duration) on the saved plan with
// the requested changes applied on top, e.g. shortening the duration below
// the saved freeze days.
const checkMergedRules = (existing, changes) => {
  const merged = {
    duration_days: Number(existing.duration_days),
    max_freeze_days: Number(existing.max_freeze_days),
    ...changes,
  };

  return z.object({}).passthrough().superRefine(checkPlanRules).safeParse(merged);
};

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

// POST /api/plan
// branch_id and created_by come from the logged-in user.
const createPlan = async (req, res) => {
  try {
    const parsed = createPlanSchema.safeParse(req.body);

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

    const [insertedId] = await db("plans").insert({
      branch_id: branchId,
      name: data.name,
      duration_days: data.duration_days,
      price_minor: data.price_minor,
      max_freeze_days: data.max_freeze_days,
      is_active: data.is_active,
      created_by: userId,
      updated_by: userId,
    });

    const plan = await findPlan(insertedId, branchId);

    return successResponse(res, { plan }, "Plan created successfully", 201);
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error creating plan:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/plan/:id  (matched on id AND the logged-in user's branch_id)
const updatePlan = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid plan id", 400);

    const parsed = updatePlanSchema.safeParse(req.body);

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

    const existing = await findPlan(id, branchId);

    if (!existing) return errorResponse(res, "Plan not found", 404);

    const merged = checkMergedRules(existing, changes);

    if (!merged.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(merged.error),
      );
    }

    await db("plans")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({ ...changes, updated_by: userId, updated_at: db.fn.now() });

    const plan = await findPlan(id, branchId);

    return successResponse(res, { plan }, "Plan updated successfully");
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error updating plan:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/plan/:id/status   body: { is_active: boolean }
const updatePlanStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid plan id", 400);

    const parsed = updatePlanStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;

    const existing = await findPlan(id, branchId);

    if (!existing) return errorResponse(res, "Plan not found", 404);

    await db("plans")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        is_active: parsed.data.is_active,
        updated_by: userId,
        updated_at: db.fn.now(),
      });

    const plan = await findPlan(id, branchId);

    return successResponse(
      res,
      { plan },
      `Plan marked as ${parsed.data.is_active ? "active" : "inactive"}`,
    );
  } catch (error) {
    console.error("Error updating plan status:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// DELETE /api/plan/:id  (soft delete, matched on id AND the logged-in user's branch_id)
const deletePlan = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid plan id", 400);

    const { branchId, userId } = req.user;

    const existing = await findPlan(id, branchId);

    if (!existing) return errorResponse(res, "Plan not found", 404);

    // Soft delete: keep the row, record who/when, and mark inactive.
    await db("plans")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        deleted_at: db.fn.now(),
        deleted_by: userId,
        is_active: false,
        updated_by: userId,
        updated_at: db.fn.now(),
      });

    return successResponse(res, { id }, "Plan deleted successfully");
  } catch (error) {
    console.error("Error deleting plan:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  updatePlanStatus,
  deletePlan,
};
