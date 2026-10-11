import api from "../axios";

import { DISCOUNT_TYPE } from "@/utils/billing";

// Bill shape (what the server sends back):
//   {
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

// GET /api/subscription/items
// Response: { success, message, data: { items, totals } }
export const getSubscriptionItems = () =>
  api.get("/subscription/items").then((res) => res.data.data);

// POST /api/subscription/items
// body: { member_id, plan_id, tax_id | null, discount_type, discount_value,
//         bill_date, start_date }
// The server calculates the amounts, adds the item and returns the whole bill.
// Response: { success, message, data: { items, totals } }
export const addSubscriptionItem = (payload) =>
  api.post("/subscription/items", payload).then((res) => res.data.data);