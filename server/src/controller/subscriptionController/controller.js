const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const { buildBillUrl } = require("../../utils/billUrl");
const {
  DISCOUNT_TYPE,
  calculateTotals,
  getEndDate,
} = require("../../utils/billing");
const {
  addItemSchema,
  completePaymentSchema,
  payDueSchema,
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
  findDuePaymentList,
  findBillDetails,
  payDue,
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

// The link the client opens for the customer once a payment is saved:
// CLIENT_URL + the branch's subbill_url + ?id=<bill_no> (see utils/billUrl.js).
// The payment is already saved by the time this runs, so a failed lookup gives
// null instead of an error.
const getSubbillUrl = async (branchId) => {
  try {
    const branch = await db("branches")
      .where({ id: branchId })
      .select("subbill_url")
      .first();

    return branch?.subbill_url ?? null;
  } catch (error) {
    console.error("Error reading branch subbill_url:", error);

    return null;
  }
};

const getBillUrl = async (branchId, billNo) =>
  buildBillUrl(await getSubbillUrl(branchId), billNo);

// Adds bill_url to every bill of a list (one branch lookup for the whole list),
// so the report pages open the bill from the link the server gives them.
const addBillUrls = async (branchId, bills) => {
  const subbillUrl = await getSubbillUrl(branchId);

  return bills.map((bill) => ({
    ...bill,
    bill_url: buildBillUrl(subbillUrl, bill.bill_no),
  }));
};

// Adds bill_url to every due receipt. The link carries the receipt id, so the
// bill opens with the payment as it stood at that receipt.
const addReceiptUrls = async (branchId, payments) => {
  const subbillUrl = await getSubbillUrl(branchId);

  return payments.map((payment) => ({
    ...payment,
    bill_url: buildBillUrl(subbillUrl, payment.bill_no, payment.receipt_id),
  }));
};

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
// { bill_no, items, totals }. Every saved item also gets its own generated
// subscription_no (SUB-<year>-<number>, e.g. SUB-2026-0001), which comes back
// on each item and wherever the bill is read (summary, details, lists). The
// server also saves bill_type "new" on every item made here; it comes back
// the same way and is never read from the request.
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
// The response also carries bill_url, the link the client opens to show the
// customer the bill: CLIENT_URL + the branch's subbill_url + ?id=<bill_no>.
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
        bill_url: await getBillUrl(branchId, billNo),
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

// POST /api/subscription/due/pay
// body: { payment_id, bill_no, paid_amount } (all required; paid_amount is in
// minor units). The branch and the user come from the verified token.
// Pays all or part of what the bill still owes (grand total minus everything
// already in subs_balance) by inserting a NEW subs_balance record and a NEW
// payments_status record against the same bill_no:
//   paid_amount >= due -> payments_status "completed" (the due is cleared)
//   paid_amount <  due -> payments_status "pending" (balance still owed)
// Only cash may be more than the due amount; the extra is given back as change
// and is not added to subs_balance.
// The response also carries bill_url, the same bill link as the payment above.
const payDueAmount = async (req, res) => {
  try {
    const parsed = payDueSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const {
      payment_id: paymentId,
      bill_no: billNo,
      paid_amount: paidAmount,
    } = parsed.data;
    const { branchId, userId } = req.user;

    const payment = await findPayment(paymentId, branchId);

    if (!payment) {
      return errorResponse(res, "Payment method not found or inactive", 404);
    }

    const result = await payDue(branchId, userId, billNo, {
      paymentId,
      paidAmount,
      isCash: payment.id === CASH_PAYMENT_ID,
    });

    if (result.error) {
      return errorResponse(res, result.error.message, result.error.status);
    }

    return successResponse(
      res,
      { ...result.data, bill_url: await getBillUrl(branchId, billNo) },
      result.data.payments_status === "completed"
        ? "Due amount paid in full"
        : "Part payment recorded, balance still due",
      201,
    );
  } catch (error) {
    console.error("Error paying due amount:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/subscription/summary?bill_no=&receipt_id=
// The full summary bill (branch, totals, member, items, payment) for one bill
// of the logged-in user's branch. 404 when the bill is not in this branch.
// With receipt_id (a due receipt, see /subscription/due/payments) the payment
// is the one at that moment: what was paid in that receipt, the due before it
// and the balance after it, instead of the bill's latest state. 404 when the
// receipt is not one of this bill's.
const getSummaryBill = async (req, res) => {
  try {
    const billNo = Number(req.query.bill_no);

    if (!Number.isInteger(billNo) || billNo <= 0) {
      return errorResponse(res, "Validation failed", 400, [
        { field: "bill_no", message: "A valid bill number is required" },
      ]);
    }

    const receiptId =
      req.query.receipt_id === undefined ? null : Number(req.query.receipt_id);

    if (receiptId !== null && (!Number.isInteger(receiptId) || receiptId <= 0)) {
      return errorResponse(res, "Validation failed", 400, [
        { field: "receipt_id", message: "A valid receipt id is required" },
      ]);
    }

    const bill = await findSummaryBill(req.user.branchId, billNo, receiptId);

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
// Every bill also carries bill_url (CLIENT_URL + the branch's subbill_url +
// ?id=<bill_no>), the link the View button opens.
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
        bills: await addBillUrls(branchId, bills),
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
// comes from the logged-in user. Oldest bill first. Every bill also carries
// bill_url, the same bill link as the subscription list.
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
        bills: await addBillUrls(branchId, bills),
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

// GET /api/subscription/due/payments?start_date&end_date&page&limit&search
// The payments made against due amounts, one row per receipt, newest first.
// Same filters as /subscription/list: start_date and end_date (YYYY-MM-DD, both
// days included; body or query string) plus page, limit and search (bill no,
// member_Id or phone). The dates filter on the day the payment was received,
// not the bill date. Each receipt shows the bill's balance as it was after
// that payment, so a due of 1500 paid as 400 then 600 reads 1100, then 500.
// Every receipt also carries bill_url (see getBillUrl). Roles 1, 2 and 3 only.
const getDuePaymentList = async (req, res) => {
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

    const { payments, totals, total } = await findDuePaymentList(branchId, {
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
        payments: await addReceiptUrls(branchId, payments),
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
      "Due payments fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching due payments:", error);

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
  getDuePaymentList,
  getBillDetails,
  payDueAmount,
};
