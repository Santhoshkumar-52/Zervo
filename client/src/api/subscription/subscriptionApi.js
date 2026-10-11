import { getPlanById } from "@/api/plan/planApi";
import { getTaxById } from "@/api/tax/taxApi";
import { calculateTotals, DISCOUNT_TYPE } from "@/utils/billing";

// STUB: the server has no subscription / discount-type controller yet.
// These functions follow the agreed contract so the screen can be built now.
// To go live, replace each body with the request in its comment.
//
// Bill shape (what the server sends back):
//   {
//     items: [{ id, plan_name, price_minor, discount_minor,
//               tax_name, tax_rate, tax_minor, total_minor }],
//     totals: { item_count, grand_total_minor }
//   }

const DISCOUNT_TYPES = [
  { id: DISCOUNT_TYPE.NONE, name: "None" },
  { id: DISCOUNT_TYPE.PERCENTAGE, name: "Percentage" },
  { id: DISCOUNT_TYPE.FIXED, name: "Fixed" },
];

// Stands in for the open bill the server would hold.
let billItems = [];

const toBill = () => ({
  items: billItems,
  totals: {
    item_count: billItems.length,
    grand_total_minor: billItems.reduce(
      (sum, item) => sum + item.total_minor,
      0,
    ),
  },
});

// GET /api/discount-type
// Response: { data: { discountTypes: [{ id, name }] } }  (no paging)
// Real version: api.get("/discount-type").then((res) => res.data.data.discountTypes)
export const getDiscountTypes = async () => DISCOUNT_TYPES;

// GET /api/subscription/items
// Response: { data: { items, totals } }
// Real version: api.get("/subscription/items").then((res) => res.data.data)
export const getSubscriptionItems = async () => toBill();

// POST /api/subscription/items
// body: { member_id, plan_id, tax_id | null, discount_type, discount_value, bill_date }
// The server calculates the amounts, saves the item and returns the whole bill.
// Real version: api.post("/subscription/items", payload).then((res) => res.data.data)
export const addSubscriptionItem = async (payload) => {
  // The stub looks the plan and tax up itself, as the server will.
  const [planResponse, taxResponse] = await Promise.all([
    getPlanById(payload.plan_id),
    payload.tax_id ? getTaxById(payload.tax_id) : null,
  ]);

  const { plan } = planResponse.data.data;
  const tax = taxResponse?.data.data.tax ?? null;

  const amounts = calculateTotals({
    priceMinor: plan.price_minor,
    discountType: payload.discount_type,
    discountValue: payload.discount_value,
    taxRate: tax?.rate,
  });

  billItems = [
    ...billItems,
    {
      id: crypto.randomUUID(),
      plan_name: plan.name,
      price_minor: amounts.priceMinor,
      discount_minor: amounts.discountMinor,
      tax_name: tax?.name ?? null,
      tax_rate: Number(tax?.rate ?? 0),
      tax_minor: amounts.taxMinor,
      total_minor: amounts.totalMinor,
    },
  ];

  return toBill();
};
