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
// body: { branch_id, payment_id, bill_no } (all required)
// Marks the bill's payment as completed.
// Response: { success, message, data: { bill_no, payment_id, payments_status } }
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