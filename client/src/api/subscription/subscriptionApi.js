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
//             change, payments_status } }
export const completeSubscriptionPayment = (payload) =>
  api.post("/subscription/payment", payload).then((res) => res.data.data);

// GET /api/subscription/summary?bill_no=
// Everything the summary bill page shows for one bill of the user's branch.
// Response: { success, message, data: { branch, summary, member, items,
//             payment, issued_by } } - see SummaryBill.jsx for the full shape.
// 404 when the bill is not found in this branch.
export const getSummaryBill = (billNo) =>
  api
    .get("/subscription/summary", { params: { bill_no: billNo } })
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
//                  payment: { status, method, paid_on } }]
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
//                  payment: { status, method, paid_on, balance, balance_status } }]
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
