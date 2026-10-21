const { z } = require("zod");

const { DISCOUNT_TYPE, parseDateOnly } = require("../../utils/billing");

const id = (label) =>
  z
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} is invalid`);

const dateOnly = (label) =>
  z
    .string({ message: `${label} is required` })
    .refine((value) => parseDateOnly(value) !== null, {
      message: `${label} must be a valid date (YYYY-MM-DD)`,
    });

// What the client sends for one bill item. The amounts are NOT accepted: the
// server works them out from the plan, tax and discount below.
// bill_no is left out for the first item of a bill and sent for the rest.
// branch_id and audit columns come from the logged-in user.
const addItemSchema = z
  .object({
    bill_no: id("Bill no").optional(),
    member_id: id("Member"),
    plan_id: id("Plan"),
    tax_id: id("Tax").nullable().optional(),
    discount_type: z
      .number({ message: "Discount type must be a number" })
      .refine((value) => Object.values(DISCOUNT_TYPE).includes(value), {
        message: "Discount type is invalid",
      })
      .default(DISCOUNT_TYPE.NONE),
    discount_value: z
      .number({ message: "Discount value must be a number" })
      .min(0, "Discount value cannot be negative")
      .default(0),
    bill_date: dateOnly("Bill date"),
    start_date: dateOnly("Start date"),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === DISCOUNT_TYPE.NONE) return;

    const addError = (message) =>
      ctx.addIssue({ code: "custom", path: ["discount_value"], message });

    const value = data.discount_value;

    if (!(value > 0)) {
      return addError("Enter a discount greater than 0");
    }

    if (Math.round(value * 100) / 100 !== value) {
      return addError("Enter a valid amount (max 2 decimals)");
    }

    if (data.discount_type === DISCOUNT_TYPE.PERCENTAGE && value > 100) {
      addError("Percentage cannot be more than 100");
    }
  });

// What the client sends to complete the payment of a bill. All four are
// required. paid_price is in minor units (paise), like every other amount.
const completePaymentSchema = z.object({
  branch_id: id("Branch"),
  payment_id: id("Payment"),
  bill_no: id("Bill no"),
  paid_price: z
    .number({ message: "Paid price must be a number" })
    .int("Paid price must be a whole number of minor units")
    .min(1, "Paid price must be greater than 0"),
});

// What the client sends to pay the due amount of a bill, fully or in part.
// paid_amount is in minor units (paise), like every other amount. The branch
// and the user come from the verified token, never from the body.
const payDueSchema = z.object({
  payment_id: id("Payment"),
  bill_no: id("Bill no"),
  paid_amount: z
    .number({ message: "Paid amount must be a number" })
    .int("Paid amount must be a whole number of minor units")
    .min(1, "Paid amount must be greater than 0"),
});

// What the client sends to list the bills of a date range (bill date, both
// ends included). Page, limit and search travel in the query string.
const listSubscriptionsSchema = z
  .object({
    start_date: dateOnly("Start date"),
    end_date: dateOnly("End date"),
  })
  .refine((data) => data.start_date <= data.end_date, {
    path: ["end_date"],
    message: "End date cannot be before the start date",
  });

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  addItemSchema,
  completePaymentSchema,
  payDueSchema,
  listSubscriptionsSchema,
  formatZodError,
};
