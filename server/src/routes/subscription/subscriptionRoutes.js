const express = require("express");

const {
  getBillItems,
  addBillItem,
  completeBillPayment,
  getSummaryBill,
  getSubscriptionList,
  getDueBillList,
  getBillDetails,
  payDueAmount,
} = require("../../controller/subscriptionController/controller");
const authorizeRoles = require("../../middleware/auth/authorizeRoles");

const router = express.Router();

// Only these roles (group ids) may list subscriptions.
const canListSubscriptions = authorizeRoles(1, 2, 3);

// The bill being built by the logged-in user. The client only sends the plan,
// tax and discount choices; the server calculates the amounts.
//
// GET  /api/subscription/items?bill_no= -> { bill_no, items, totals }
// POST /api/subscription/items -> save one item, returns the whole bill
//      body: { bill_no?, member_id, plan_id, tax_id | null, discount_type,
//              discount_value, bill_date, start_date }
//      No bill_no starts a new bill; send the returned bill_no to add more items.
// GET  /api/subscription/summary?bill_no= -> the full summary bill for one bill
//      { branch, summary, member, items, payment, issued_by }
// POST /api/subscription/payment -> mark the bill's payment as completed
//      body: { branch_id, payment_id, bill_no } (all required)
// GET  /api/subscription/list?page=1&limit=10&search= -> paginated bills of a bill-date range
//      body: { start_date, end_date } (YYYY-MM-DD, both days included), or the
//      same two fields in the query string for clients that cannot send a GET body
//      search matches bill_no, member_Id or phone; roles 1, 2 and 3 only.
//      -> { bills, pagination }
// GET  /api/subscription/due?page=1&limit=10&search= -> paginated bills that are due
//      (balance owed, not written off, not cancelled) for the user's branch,
//      oldest bill first; search matches bill_no, member_Id or phone;
//      roles 1, 2 and 3 only.
//      -> { bills, totals, pagination }
// GET  /api/subscription/details?bill_no= -> one bill with its transactions so far
//      { branch, summary, member, items, payment, issued_by, transactions, balance };
//      roles 1, 2 and 3 only; 404 when the bill is not in the user's branch.
// POST /api/subscription/due/pay -> pay the due amount of a bill, fully or in part
//      body: { payment_id, bill_no, paid_amount } (all required; paid_amount in
//      minor units). The branch and the user come from the token.
//      Inserts a new subs_balance and a new payments_status record against the
//      same bill_no: "completed" when the due is cleared, otherwise "pending".
//      Only cash may be more than the due amount (the rest is change).
//      roles 1, 2 and 3 only.
//      -> { bill_no, payment_id, paid_amount, change, paid_total, balance,
//           payments_status }
router.get("/items", getBillItems);
router.post("/items", addBillItem);
router.get("/summary", getSummaryBill);
router.post("/payment", completeBillPayment);
router.get("/list", canListSubscriptions, getSubscriptionList);
router.get("/due", canListSubscriptions, getDueBillList);
router.post("/due/pay", canListSubscriptions, payDueAmount);
router.get("/details", canListSubscriptions, getBillDetails);

module.exports = router;
