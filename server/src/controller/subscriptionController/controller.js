const crypto = require("crypto");

const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  DISCOUNT_TYPE,
  calculateTotals,
  getEndDate,
} = require("../../utils/billing");
const { addItemSchema, formatZodError } = require("./schema");
const { getItems, addItem, toBill } = require("./billStore");

// Every lookup is scoped to the logged-in user's branch and hides soft-deleted
// rows, so a client cannot bill against another branch's member, plan or tax.
const findMember = (id, branchId) =>
  db("members")
    .where({ id, branch_id: branchId })
    .whereNull("deleted_at")
    .select("id")
    .first();

const findPlan = (id, branchId) =>
  db("plans")
    .where({ id, branch_id: branchId, is_active: true })
    .whereNull("deleted_at")
    .select("id", "name", "duration_days", "price_minor")
    .first();

const findTax = (id, branchId) =>
  db("taxes")
    .where({ id, branch_id: branchId, is_active: true })
    .whereNull("deleted_at")
    .select("id", "name", "rate")
    .first();

// GET /api/subscription/items
// -> { items, totals } for the bill the logged-in user is building.
const getBillItems = async (req, res) => {
  try {
    const { branchId, userId } = req.user;

    return successResponse(
      res,
      toBill(getItems(branchId, userId)),
      "Bill fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching bill:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/subscription/items
// body: { member_id, plan_id, tax_id | null, discount_type, discount_value,
//         bill_date, start_date }
// The server looks the plan and tax up, works out the discount, tax, total and
// end date itself, adds the item and returns the whole bill: { items, totals }.
const addBillItem = async (req, res) => {
  try {
    const parsed = addItemSchema.safeParse(req.body);

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

    // Member and bill date belong to the whole bill: once it has items, every
    // new item must use the same ones.
    const [firstItem] = getItems(branchId, userId);

    if (firstItem && firstItem.member_id !== data.member_id) {
      return errorResponse(
        res,
        "All items on a bill must be for the same member",
        409,
        [{ field: "member_id", message: "Member is locked while the bill has items" }],
      );
    }

    if (firstItem && firstItem.bill_date !== data.bill_date) {
      return errorResponse(
        res,
        "All items on a bill must have the same bill date",
        409,
        [{ field: "bill_date", message: "Bill date is locked while the bill has items" }],
      );
    }

    const [member, plan, tax] = await Promise.all([
      findMember(data.member_id, branchId),
      findPlan(data.plan_id, branchId),
      data.tax_id ? findTax(data.tax_id, branchId) : null,
    ]);

    if (!member) return errorResponse(res, "Member not found", 404);

    if (!plan) return errorResponse(res, "Plan not found or inactive", 404);

    if (data.tax_id && !tax) {
      return errorResponse(res, "Tax not found or inactive", 404);
    }

    const discountValue =
      data.discount_type === DISCOUNT_TYPE.NONE ? 0 : data.discount_value;

    // A fixed discount cannot be more than the plan price.
    if (
      data.discount_type === DISCOUNT_TYPE.FIXED &&
      Math.round(discountValue * 100) > Number(plan.price_minor)
    ) {
      return errorResponse(res, "Validation failed", 400, [
        {
          field: "discount_value",
          message: "Cannot be more than the plan price",
        },
      ]);
    }

    const amounts = calculateTotals({
      priceMinor: plan.price_minor,
      discountType: data.discount_type,
      discountValue,
      taxRate: tax?.rate,
    });

    const items = addItem(branchId, userId, {
      id: crypto.randomUUID(),
      member_id: data.member_id,
      bill_date: data.bill_date,
      plan_id: plan.id,
      plan_name: plan.name,
      start_date: data.start_date,
      end_date: getEndDate(data.start_date, plan.duration_days),
      price_minor: amounts.priceMinor,
      discount_type: data.discount_type,
      discount_minor: amounts.discountMinor,
      tax_id: tax?.id ?? null,
      tax_name: tax?.name ?? null,
      tax_rate: Number(tax?.rate ?? 0),
      tax_minor: amounts.taxMinor,
      total_minor: amounts.totalMinor,
    });

    return successResponse(res, toBill(items), "Item added to the bill", 201);
  } catch (error) {
    console.error("Error adding bill item:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getBillItems,
  addBillItem,
};