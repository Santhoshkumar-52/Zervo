const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  createTaxSchema,
  updateTaxSchema,
  updateTaxStatusSchema,
  formatZodError,
} = require("./schema");

// Columns returned for a tax (list + single tax).
const TAX_COLUMNS = [
  "taxes.id",
  "taxes.branch_id",
  "taxes.name",
  "taxes.rate",
  "taxes.description",
  "taxes.is_active",
  "taxes.created_at",
  "taxes.updated_at",

  "branches.name as branch_name",
  "branches.is_active as branch_is_active",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Taxes scoped to the logged-in user's branch. Soft-deleted rows are hidden.
const taxQuery = (branchId) =>
  db("taxes")
    .join("branches", "taxes.branch_id", "branches.id")
    .where("taxes.branch_id", branchId)
    .whereNull("taxes.deleted_at");

const findTax = (id, branchId) =>
  taxQuery(branchId).where("taxes.id", id).select(TAX_COLUMNS).first();

// Returns a response for a duplicate value, otherwise null.
// Unique index: (branch_id, name). Soft-deleted rows still hold their name.
const duplicateResponse = (res, error) => {
  if (error.code !== "ER_DUP_ENTRY") return null;

  return errorResponse(res, "A tax with this name already exists", 409, [
    { field: "name", message: "Tax name is already in use" },
  ]);
};

// GET /api/tax?page&limit&search&taxActive
const getTaxes = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const taxActive = req.query.taxActive;

    const baseQuery = taxQuery(branchId);

    if (search) {
      baseQuery.where((query) => {
        query
          .where("taxes.name", "like", `%${search}%`)
          .orWhere("taxes.description", "like", `%${search}%`);
      });
    }

    if (taxActive !== undefined) {
      baseQuery.where("taxes.is_active", taxActive === "true");
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("taxes.id as total");

    const taxes = await baseQuery
      .clone()
      .select(TAX_COLUMNS)
      .orderBy("taxes.name", "asc")
      .orderBy("taxes.id", "desc")
      .limit(limit)
      .offset(offset);

    const totalTaxes = Number(total);
    const totalPages = Math.ceil(totalTaxes / limit);

    return successResponse(
      res,
      {
        taxes,
        pagination: {
          page,
          limit,
          total: totalTaxes,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Taxes fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching taxes:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/tax/:id
const getTaxById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid tax id", 400);

    const tax = await findTax(id, req.user.branchId);

    if (!tax) return errorResponse(res, "Tax not found", 404);

    return successResponse(res, { tax }, "Tax fetched successfully");
  } catch (error) {
    console.error("Error fetching tax:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/tax
// branch_id and created_by come from the logged-in user.
const createTax = async (req, res) => {
  try {
    const parsed = createTaxSchema.safeParse(req.body);

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

    const [insertedId] = await db("taxes").insert({
      branch_id: branchId,
      name: data.name,
      rate: data.rate,
      description: data.description || null,
      is_active: data.is_active,
      created_by: userId,
      updated_by: userId,
    });

    const tax = await findTax(insertedId, branchId);

    return successResponse(res, { tax }, "Tax created successfully", 201);
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error creating tax:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/tax/:id  (matched on id AND the logged-in user's branch_id)
const updateTax = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid tax id", 400);

    const parsed = updateTaxSchema.safeParse(req.body);

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

    const existing = await findTax(id, branchId);

    if (!existing) return errorResponse(res, "Tax not found", 404);

    if (changes.description !== undefined) {
      changes.description = changes.description || null;
    }

    await db("taxes")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({ ...changes, updated_by: userId, updated_at: db.fn.now() });

    const tax = await findTax(id, branchId);

    return successResponse(res, { tax }, "Tax updated successfully");
  } catch (error) {
    const duplicate = duplicateResponse(res, error);
    if (duplicate) return duplicate;

    console.error("Error updating tax:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// PATCH /api/tax/:id/status   body: { is_active: boolean }
const updateTaxStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid tax id", 400);

    const parsed = updateTaxStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;

    const existing = await findTax(id, branchId);

    if (!existing) return errorResponse(res, "Tax not found", 404);

    await db("taxes")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        is_active: parsed.data.is_active,
        updated_by: userId,
        updated_at: db.fn.now(),
      });

    const tax = await findTax(id, branchId);

    return successResponse(
      res,
      { tax },
      `Tax marked as ${parsed.data.is_active ? "active" : "inactive"}`,
    );
  } catch (error) {
    console.error("Error updating tax status:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// DELETE /api/tax/:id  (soft delete, matched on id AND the logged-in user's branch_id)
const deleteTax = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) return errorResponse(res, "Invalid tax id", 400);

    const { branchId, userId } = req.user;

    const existing = await findTax(id, branchId);

    if (!existing) return errorResponse(res, "Tax not found", 404);

    // Soft delete: keep the row, record who/when, and mark inactive.
    await db("taxes")
      .where({ id, branch_id: branchId })
      .whereNull("deleted_at")
      .update({
        deleted_at: db.fn.now(),
        deleted_by: userId,
        is_active: false,
        updated_by: userId,
        updated_at: db.fn.now(),
      });

    return successResponse(res, { id }, "Tax deleted successfully");
  } catch (error) {
    console.error("Error deleting tax:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getTaxes,
  getTaxById,
  createTax,
  updateTax,
  updateTaxStatus,
  deleteTax,
};
