const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

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

const DISCOUNT_TYPES = ["percentage", "fixed"];

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

// GET /api/discount?page&limit&search&discountActive&type
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
      if (!DISCOUNT_TYPES.includes(type)) {
        return errorResponse(res, "Invalid discount type", 400);
      }

      baseQuery.where("discounts.type_name", type);
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

module.exports = {
  getDiscounts,
  getDiscountById,
};
