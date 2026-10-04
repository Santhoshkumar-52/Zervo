const { z } = require("zod");

const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  DISCOUNT_TYPES,
  checkDiscountRules,
  createDiscountSchema,
  updateDiscountSchema,
  updateDiscountStatusSchema,
  formatZodError,
} = require("./schema");

// Columns returned for a discount (list + single discount).
const DISCOUNT_COLUMNS = [
  "discounts.id",
  "discounts.branch_id",
  "discounts.name",
  "discounts.type",
  "discounts.type_name",
  "discounts.value",
  "discounts.description",
  "discounts.is_active",
  // plain YYYY-MM-DD so the client date input is not shifted by timezone
  db.raw("DATE_FORMAT(discounts.starts_on, '%Y-%m-%d') as starts_on"),
  db.raw("DATE_FORMAT(discounts.ends_on, '%Y-%m-%d') as ends_on"),
  "discounts.created_at",
  "discounts.updated_at",

  "branches.name as branch_name",
  "branches.is_active as branch_is_active",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Discounts scoped to the logged-in user's branch. Soft-deleted rows are hidden.
const discountQuery = (branchId) =>
  db("discounts")
    .join("branches", "discounts.branch_id", "branches.id")
    .where("discounts.branch_id", branchId)
    .whereNull("discounts.deleted_at");

const findDiscount = (id, branchId) =>
  discountQuery(branchId)
    .where("discounts.id", id)
    .select(DISCOUNT_COLUMNS)
    .first();

// Returns a response for a duplicate value, otherwise null.
// Unique index: (branch_id, name). Soft-deleted rows still hold their name.
const duplicateResponse = (res, error) => {
  if (error.code !== "ER_DUP_ENTRY") return null;

  return errorResponse(res, "A discount with this name already exists", 409, [
    { field: "name", message: "Discount name is already in use" },
  ]);
};

// Runs the cross-field rules (percentage <= 100, end date >= start date) on
// the saved discount with the requested changes applied on top.
const checkMergedRules = (existing, changes) => {
  const merged = {
    type: existing.type,
    value: Number(existing.value),
    starts_on: existing.starts_on,
    ends_on: existing.ends_on,
    ...changes,
  };

  return z.object({}).passthrough().superRefine(checkDiscountRules).safeParse(merged);
};

// GET /api/discount?page&limit&search&discountActive&type
// type: 1 (percentage) or 2 (fixed)
const getDiscounts = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const discountActive = req.query.discountActive;
    const type = req.query.type;

    const baseQuery = discountQuery(branchId);

    if (search) {
      baseQuery.where((query) => {
        query
          .where("discounts.name", "like", `%${search}%`)
          .orWhere("discounts.description", "like", `%${search}%`);
      });
    }

    if (discountActive !== undefined) {
      baseQuery.where("discounts.is_active", discountActive === "true");
    }

    if (type !== undefined) {
      if (!DISCOUNT_TYPES[type]) {
        return errorResponse(res, "Invalid discount type", 400);
      }

      baseQuery.where("discounts.type_name", DISCOUNT_TYPES[type]);
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("discounts.id as total");

    const discounts = await baseQuery
      .clone()
      .select(DISCOUNT_COLUMNS)
      .orderBy("discounts.name", "asc")
      .orderBy("discounts.id", "desc")
      .limit(limit)
      .offset(offset);

    const totalDiscounts = Number(total);
    const totalPages = Math.ceil(totalDiscounts / limit);

    return successResponse(
      res,
      {
        discounts,
        pagination: {
          page,
          limit,
          total: totalDiscounts,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Discounts fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching discounts:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/discount/:id
const getDiscountById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid discount id", 400);

    const discount = await findDiscount(id, req.user.branchId);

    if (!discount) return errorResponse(res, "Discount not found", 404);

    return successResponse(res, { discount }, "Discount fetched successfully");
  } catch (error) {
    console.error("Error fetching discount:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/discount
// branch_id, type_name and created_by are set by the server.
const createDiscount = async (req, res) => {
  try {
    const parsed = createDiscountSchema.safeParse(req.body);

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

    const [insertedId] = await db("discounts").insert({
      branch_id: branchId,
      name: data.name,
      type: data.type,
      type_name: DISCOUNT_TYPES[data.type],
      value: data.value,
      description: data.description || null,
      is_active: data.is_active,
      starts_on: data.starts_on ?? null,
      ends_on: data.ends_on ?? null,
      created_by: userId,
      updated_by: userId,
    });

    const discount = await findDiscount(insertedId, branchId);

    return successResponse(
      res,
      { discount },
      "Discount created successfully",
      201,
    );
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error creating discount:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/discount/:id  (matched on id AND the logged-in user's branch_id)
const updateDiscount = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid discount id", 400);

    const parsed = updateDiscountSchema.safeParse(req.body);

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

    const existing = await findDiscount(id, branchId);

    if (!existing) return errorResponse(res, "Discount not found", 404);

    // e.g. switching to percentage while the saved value is 500, or moving
    // only the end date before the saved start date.
    const merged = checkMergedRules(existing, changes);

    if (!merged.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(merged.error),
      );
    }

    if (changes.description !== undefined) {
      changes.description = changes.description || null;
    }

    // type_name always follows type.
    if (changes.type !== undefined) {
      changes.type_name = DISCOUNT_TYPES[changes.type];
    }

    await db("discounts")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({ ...changes, updated_by: userId, updated_at: db.fn.now() });

    const discount = await findDiscount(id, branchId);

    return successResponse(res, { discount }, "Discount updated successfully");
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error updating discount:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/discount/:id/status   body: { is_active: boolean }
const updateDiscountStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid discount id", 400);

    const parsed = updateDiscountStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;

    const existing = await findDiscount(id, branchId);

    if (!existing) return errorResponse(res, "Discount not found", 404);

    await db("discounts")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        is_active: parsed.data.is_active,
        updated_by: userId,
        updated_at: db.fn.now(),
      });

    const discount = await findDiscount(id, branchId);

    return successResponse(
      res,
      { discount },
      `Discount marked as ${parsed.data.is_active ? "active" : "inactive"}`,
    );
  } catch (error) {
    console.error("Error updating discount status:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// DELETE /api/discount/:id  (soft delete, matched on id AND the logged-in user's branch_id)
const deleteDiscount = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid discount id", 400);

    const { branchId, userId } = req.user;

    const existing = await findDiscount(id, branchId);

    if (!existing) return errorResponse(res, "Discount not found", 404);

    // Soft delete: keep the row, record who/when, and mark inactive.
    await db("discounts")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        deleted_at: db.fn.now(),
        deleted_by: userId,
        is_active: false,
        updated_by: userId,
        updated_at: db.fn.now(),
      });

    return successResponse(res, { id }, "Discount deleted successfully");
  } catch (error) {
    console.error("Error deleting discount:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  updateDiscountStatus,
  deleteDiscount,
};
