import api from "../axios";

import { DISCOUNT_TYPE } from "@/utils/billing";

// Bill shape (what the server sends back):
//   {
//     bill_no,
//     items: [{ id, plan_name, start_date, end_date, price_minor,
//               discount_minor, tax_name, tax_rate, tax_minor, total_minor }],
//     totals: { item_count, grand_total_minor }
//   }
// The server calculates every amount (and the end date) itself; the client
// only sends the choices the user made.

// STUB: the server has no discount-type controller yet.
// To go live, replace the body with:
//   api.get("/discount-type").then((res) => res.data.data.discountTypes)
// Response: { data: { discountTypes: [{ id, name }] } }  (no paging)
const DISCOUNT_TYPES = [
  { id: DISCOUNT_TYPE.NONE, name: "None" },
  { id: DISCOUNT_TYPE.PERCENTAGE, name: "Percentage" },
  { id: DISCOUNT_TYPE.FIXED, name: "Fixed" },
];

export const getDiscountTypes = async () => DISCOUNT_TYPES;

// GET /api/subscription/items?bill_no=
// Response: { success, message, data: { bill_no, items, totals } }
export const getSubscriptionItems = (billNo) =>
  api
    .get("/subscription/items", { params: { bill_no: billNo } })
    .then((res) => res.data.data);

// POST /api/subscription/items
// body: { bill_no?, member_id, plan_id, tax_id | null, discount_type,
//         discount_value, bill_date, start_date }
// Leave bill_no out for the first item; send the bill's bill_no for the rest.
// The server calculates the amounts, adds the item and returns the whole bill.
// Response: { success, message, data: { bill_no, items, totals } }
export const addSubscriptionItem = (payload) =>
  api.post("/subscription/items", payload).then((res) => res.data.data);

// POST /api/subscription/payment
// body: { branch_id, payment_id, bill_no, paid_price } (all required;
// paid_price is in minor units and can only be more than the bill's grand
// total when the payment method is cash)
// Saves the payment: status is "completed" when paid_price covers the grand
// total, otherwise "pending". For cash (payment_id 1) any extra is returned as
// change; every other method has change 0.
// Response: { success, message, data: { bill_no, payment_id, paid_price,
//             change, payments_status, bill_url } }
// bill_url is the link to open for the customer, built by the server from
// CLIENT_URL + the branch's subbill_url + ?id=<bill_no>.
export const completeSubscriptionPayment = (payload) =>
  api.post("/subscription/payment", payload).then((res) => res.data.data);

// GET /api/subscription/summary?bill_no=&receipt_id=
// Everything the summary bill page shows for one bill of the user's branch.
// With receiptId (a due receipt from /subscription/due/payments) `payment` is
// the payment as it stood at that receipt: { status, method, paid_on,
// paid_price, change, balance, due_before, receipt_no }. 404 when the receipt
// is not one of the bill's.
// Response: { success, message, data: { branch, summary, member, items,
//             payment, issued_by } } - see SummaryBill.jsx for the full shape.
// 404 when the bill is not found in this branch.
export const getSummaryBill = (billNo, receiptId) =>
  api
    .get("/subscription/summary", {
      params: { bill_no: billNo, receipt_id: receiptId ?? undefined },
    })
    .then((res) => res.data.data);

// GET /api/subscription/list
// params: { start_date, end_date, page, limit, search }
//   start_date, end_date  YYYY-MM-DD, both days included (required)
//   page (default 1), limit (default 10, max 100), search (bill no, member ID
//   or phone)
// The server accepts the dates in the query string, since a browser cannot
// send a body on GET. Only roles 1, 2 and 3 may call it (403 otherwise).
// Response: { success, message, data: { bills, pagination } }
//   bills:      [{ bill_no, bill_date, member: { id, member_id, name, phone, avatar_url },
//                  item_count, total_minor,
//                  payment: { status, method, paid_on }, bill_url }]
//   bill_url is the link the View button opens (CLIENT_URL + the branch's
//   subbill_url + ?id=<bill_no>), built by the server.
//   pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
export const getSubscriptionList = (params = {}) => {
  // Drop empty values so we never send ?search=
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api
    .get("/subscription/list", { params: cleanParams })
    .then((res) => res.data.data);
};

// GET /api/subscription/due
// params: { page, limit, search }
//   page (default 1), limit (default 10, max 100), search (bill no, member ID
//   or phone). No date range: every bill that still owes money is included.
// Due = part paid (has a balance record), balance not written off, not
// cancelled. Oldest bill first. Only roles 1, 2 and 3 may call it (403
// otherwise). The branch comes from the logged-in user.
// Response: { success, message, data: { bills, totals, pagination } }
//   bills:      [{ bill_no, bill_date, member: { id, member_id, name, phone, avatar_url },
//                  item_count, total_minor, paid_minor, balance_minor,
//                  payment: { status, method, paid_on, balance, balance_status },
//                  bill_url }]   (bill_url: same link as in /subscription/list)
//   totals:     { bill_count, total_amount, total_paid, total_balance }
//               (minor units, every matching bill - not just this page)
//   pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
export const getDueBillList = (params = {}) => {
  // Drop empty values so we never send ?search=
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api
    .get("/subscription/due", { params: cleanParams })
    .then((res) => res.data.data);
};

// GET /api/subscription/details?bill_no=
// One bill of the user's branch with the payments received so far. Only roles
// 1, 2 and 3 may call it (403 otherwise); 404 when the bill is not found.
// Response: { success, message, data: { branch, summary, member, items,
//             payment, issued_by, transactions, balance } }
//   (branch, summary, member, items, payment, issued_by: same as /summary)
//   transactions: [{ id, type, payment_id, method, status, paid_minor,
//                    change_minor, received_minor, paid_on, received_by }]
//   balance:      { paid_minor, balance_minor, written_off, is_due }
export const getBillDetails = (billNo) =>
  api
    .get("/subscription/details", { params: { bill_no: billNo } })
    .then((res) => res.data.data);
// POST /api/subscription/due/pay
// body: { payment_id, bill_no, paid_amount } (all required; paid_amount is in
// minor units). The branch and the user come from the logged-in user's token,
// so they are not sent. Only roles 1, 2 and 3 may call it (403 otherwise).
// Pays all or part of what the bill still owes by adding a new balance record
// and a new payment record against the same bill_no. The status is "completed"
// when the due is cleared, otherwise "pending". Only cash (payment_id 1) may be
// more than the due amount; the extra comes back as change.
// Response: { success, message, data: { bill_no, payment_id, paid_amount,
//             change, paid_total, balance, payments_status, bill_url } }
// 404 when the bill or payment method is not found; 409 when the bill has no
// due amount, is cancelled or was written off.
export const payDueAmount = (payload) =>
  api.post("/subscription/due/pay", payload).then((res) => res.data.data);


// GET /api/subscription/due/payments
// params: { start_date, end_date, page, limit, search }
//   start_date, end_date  YYYY-MM-DD, both days included (required); they
//   filter on the day the payment was received, not the bill date
//   page (default 1), limit (default 10, max 100), search (bill no, member ID
//   or phone)
// The payments made against due amounts, one receipt per row, newest first.
// Only roles 1, 2 and 3 may call it (403 otherwise). The branch comes from the
// logged-in user.
// Response: { success, message, data: { payments, totals, pagination } }
//   payments:   [{ receipt_id, receipt_no, bill_no, bill_date, subscription_no,
//                  member: { id, member_id, name, phone, avatar_url },
//                  total_minor, due_before_minor, paid_minor, change_minor,
//                  balance_minor, status, method, paid_on, received_by,
//                  bill_url }]
//               receipt_no counts the bill's due payments (1, 2, ...);
//               balance_minor is what the bill still owed right after it
//               (due 1500: pays 400 -> 1100, then pays 600 -> 500).
//   totals:     { payment_count, total_received }
//               (minor units, every matching receipt - not just this page)
//   pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
export const getDuePaymentList = (params = {}) => {
  // Drop empty values so we never send ?search=
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api
    .get("/subscription/due/payments", { params: cleanParams })
    .then((res) => res.data.data);
};
