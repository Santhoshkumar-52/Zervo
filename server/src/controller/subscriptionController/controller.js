const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  DISCOUNT_TYPE,
  calculateTotals,
  getEndDate,
} = require("../../utils/billing");
const {
  addItemSchema,
  completePaymentSchema,
  listSubscriptionsSchema,
  formatZodError,
} = require("./schema");
const {
  generateBillNo,
  getItems,
  addItem,
  findBillRecords,
  completePayment,
  toBill,
  findSummaryBill,
  findSubscriptionList,
  findDueBillList,
  findBillDetails,
} = require("./billStore");

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

const findPayment = (id, branchId) =>
  db("payments")
    .where({ id, branch_id: branchId, is_active: true })
    .whereNull("deleted_at")
    .select("id")
    .first();

// Cash is payment_id 1. Only cash may take more than the grand total; the
// difference is given back as change. Every other method has no change.
const CASH_PAYMENT_ID = 1;

// GET /api/subscription/items?bill_no=
// -> { bill_no, items, totals } for that bill (empty when no bill_no is sent).
const getBillItems = async (req, res) => {
  try {
    const { branchId } = req.user;
    const billNo = Number(req.query.bill_no) || null;
    const items = billNo ? await getItems(branchId, billNo) : [];

    return successResponse(
      res,
      toBill(billNo, items),
      "Bill fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching bill:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// POST /api/subscription/items
// body: { bill_no?, member_id, plan_id, tax_id | null, discount_type,
//         discount_value, bill_date, start_date }
// Without bill_no a new bill number is generated; with it the item is added to
// that bill. The server looks the plan and tax up, works out the discount, tax,
// total and end date itself, saves the item and returns the whole bill:
// { bill_no, items, totals }.
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
    const billNo = data.bill_no ?? generateBillNo();

    // Member and bill date belong to the whole bill: once it has items, every
    // new item must use the same ones.
    const billItems = data.bill_no ? await getItems(branchId, billNo) : [];

    if (data.bill_no && !billItems.length) {
      return errorResponse(res, "Bill not found", 404);
    }

    const [firstItem] = billItems;

    if (firstItem && firstItem.member_id !== data.member_id) {
      return errorResponse(
        res,
        "All items on a bill must be for the same member",
        409,
        [
          {
            field: "member_id",
            message: "Member is locked while the bill has items",
          },
        ],
      );
    }

    if (firstItem && firstItem.bill_date !== data.bill_date) {
      return errorResponse(
        res,
        "All items on a bill must have the same bill date",
        409,
        [
          {
            field: "bill_date",
            message: "Bill date is locked while the bill has items",
          },
        ],
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

    const items = await addItem(branchId, userId, billNo, {
      member_id: data.member_id,
      bill_date: data.bill_date,
      plan_id: plan.id,
      plan_name: plan.name,
      start_date: data.start_date,
      end_date: getEndDate(data.start_date, plan.duration_days),
      price_minor: amounts.priceMinor,
      discount_type: data.discount_type,
      discount_rate:
        data.discount_type === DISCOUNT_TYPE.PERCENTAGE ? discountValue : null,
      discount_minor: amounts.discountMinor,
      taxable_minor: amounts.taxableMinor,
      tax_rate: Number(tax?.rate ?? 0),
      tax_minor: amounts.taxMinor,
      total_minor: amounts.totalMinor,
    });

    return successResponse(
      res,
      toBill(billNo, items),
      "Item added to the bill",
      201,
    );
  } catch (error) {
    console.error("Error adding bill item:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// Logs why the payment was refused and sends the same message to the client.
const rejectPayment = (res, message, status) => {
  console.error("Error completing payment:", message);

  return errorResponse(res, message, status);
};

// POST /api/subscription/payment
// body: { branch_id, payment_id, bill_no, paid_price } (all required;
// paid_price is in minor units)
// The bill must exist in subs_summ, subs_items and payments_status and must not
// be completed yet. paid_price cannot be more than the bill's grand total
// unless the payment method is cash (payment_id 1).
// Then its payments_status rows are saved with the payment_id and paid_price:
//   paid_price >= grand total -> "completed"
//   paid_price <  grand total -> "pending" (not fully paid)
// change is paid_price - grand total for cash, otherwise 0.
const completeBillPayment = async (req, res) => {
  try {
    const parsed = completePaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const {
      branch_id: branchId,
      payment_id: paymentId,
      bill_no: billNo,
      paid_price: paidPrice,
    } = parsed.data;
    const { userId } = req.user;

    const { summ, item, statuses } = await findBillRecords(branchId, billNo);

    if (!summ) {
      return rejectPayment(res, "Bill not found in subscription summary", 404);
    }

    if (!item) {
      return rejectPayment(res, "Bill has no subscription items", 404);
    }

    if (!statuses.length) {
      return rejectPayment(res, "Bill has no payment status", 404);
    }

    if (statuses.includes("completed")) {
      return rejectPayment(
        res,
        "Payment for this bill is already completed",
        409,
      );
    }

    const payment = await findPayment(paymentId, branchId);

    if (!payment) {
      return rejectPayment(res, "Payment method not found or inactive", 404);
    }

    const { grand_total_minor: grandTotal } = toBill(
      billNo,
      await getItems(branchId, billNo),
    ).totals;

    const isCash = payment.id === CASH_PAYMENT_ID;

    if (!isCash && paidPrice > grandTotal) {
      return rejectPayment(
        res,
        "Only cash can be more than the grand total",
        400,
      );
    }

    const paymentsStatus = "completed";
    const changePrice =
      isCash && paidPrice > grandTotal ? paidPrice - grandTotal : 0;

    // Not fully paid: the unpaid rest is recorded in subs_balance.
    const hasBalance = paidPrice < grandTotal;

    await completePayment(
      branchId,
      billNo,
      { paymentId, paidPrice, changePrice, paymentsStatus, hasBalance },
      userId,
    );

    return successResponse(
      res,
      {
        bill_no: billNo,
        payment_id: paymentId,
        paid_price: paidPrice,
        change: changePrice,
        payments_status: paymentsStatus,
      },
      paymentsStatus === "completed"
        ? "Payment completed successfully"
        : "Payment recorded as pending",
    );
  } catch (error) {
    console.error("Error completing payment:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/subscription/summary?bill_no=
// The full summary bill (branch, totals, member, items, payment) for one bill
// of the logged-in user's branch. 404 when the bill is not in this branch.
const getSummaryBill = async (req, res) => {
  try {
    const billNo = Number(req.query.bill_no);

    if (!Number.isInteger(billNo) || billNo <= 0) {
      return errorResponse(res, "Validation failed", 400, [
        { field: "bill_no", message: "A valid bill number is required" },
      ]);
    }

    const bill = await findSummaryBill(req.user.branchId, billNo);

    if (!bill) return errorResponse(res, "Bill not found", 404);

    return successResponse(res, bill, "Summary bill fetched successfully");
  } catch (error) {
    console.error("Error fetching summary bill:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/subscription/list?page&limit&search
// body: { start_date, end_date } (YYYY-MM-DD, compared with the bill date,
// both days included). Clients that cannot send a body on GET (browser fetch,
// axios) may send start_date and end_date in the query string instead.
// Lists the logged-in user's branch bills, one row per
// bill, newest first. page defaults to 1 and limit to 10 (max 100); search
// matches the bill no, the member's member_Id or the member's phone.
// Each bill carries its payment status, balance status and what was received
// per method (cash, card, upi); `totals` adds the same up over every matching
// bill, not just the page. Money is in minor units.
const getSubscriptionList = async (req, res) => {
  try {
    const parsed = listSubscriptionsSchema.safeParse({
      start_date: req.body?.start_date ?? req.query.start_date,
      end_date: req.body?.end_date ?? req.query.end_date,
    });

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = req.query.search?.trim() || "";

    const { bills, totals, total } = await findSubscriptionList(branchId, {
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      search,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      res,
      {
        bills,
        totals,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Subscriptions fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching subscriptions:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// Bills that are due: part paid (subs_balance), not written off, not cancelled. The branch
// comes from the logged-in user. Oldest bill first.
const getDueBillList = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = req.query.search?.trim() || "";

    const { bills, totals, total } = await findDueBillList(branchId, {
      search,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      res,
      {
        bills,
        totals,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Due bills fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching due bills:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/subscription/details?bill_no=
// One bill of the logged-in user's branch with its transactions so far: the
// summary bill (branch, summary, member, items, payment, issued_by) plus
// `transactions` (the payments received) and `balance` (paid, still owed,
// written off, is_due). 404 when the bill is not in this branch.
const getBillDetails = async (req, res) => {
  try {
    const billNo = Number(req.query.bill_no);

    if (!Number.isInteger(billNo) || billNo <= 0) {
      return errorResponse(res, "Validation failed", 400, [
        { field: "bill_no", message: "A valid bill number is required" },
      ]);
    }

    const bill = await findBillDetails(req.user.branchId, billNo);

    if (!bill) return errorResponse(res, "Bill not found", 404);

    return successResponse(res, bill, "Bill details fetched successfully");
  } catch (error) {
    console.error("Error fetching bill details:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getBillItems,
  addBillItem,
  completeBillPayment,
  getSummaryBill,
  getSubscriptionList,
  getDueBillList,
  getBillDetails,
};
