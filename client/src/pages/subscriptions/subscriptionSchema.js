import { z } from "zod";

import { DISCOUNT_TYPE } from "@/utils/billing";

// A dropdown holds the whole selected record, so "selected" means it has an id.
const selected = (message) => z.any().refine((item) => Boolean(item?.id), message);

export const subscriptionSchema = z
  .object({
    member: selected("Select a member"),
    plan: selected("Select a plan"),
    tax: z.any(),
    bill_date: z.string().min(1, "Select the bill date"),
    start_date: z.string().min(1, "Select the start date"),
    discount_type: z.number(),
    // Kept as text in the form and converted when the item is added.
    discount_value: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === DISCOUNT_TYPE.NONE) return;

    const addError = (message) =>
      ctx.addIssue({ code: "custom", path: ["discount_value"], message });

    const text = data.discount_value;
    const value = Number(text);

    if (!text || !(value > 0)) {
      return addError("Enter a discount greater than 0");
    }

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      return addError("Enter a valid amount (max 2 decimals)");
    }

    if (data.discount_type === DISCOUNT_TYPE.PERCENTAGE && value > 100) {
      return addError("Percentage cannot be more than 100");
    }

    if (
      data.discount_type === DISCOUNT_TYPE.FIXED &&
      data.plan?.price_minor != null &&
      Math.round(value * 100) > Number(data.plan.price_minor)
    ) {
      addError("Cannot be more than the plan price");
    }
  });

export const getDefaultValues = (today) => ({
  member: null,
  plan: null,
  tax: null,
  bill_date: today,
  start_date: "",
  discount_type: DISCOUNT_TYPE.NONE,
  discount_value: "",
});
