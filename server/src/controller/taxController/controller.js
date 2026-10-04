const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

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

module.exports = {
  getTaxes,
  getTaxById,
};
