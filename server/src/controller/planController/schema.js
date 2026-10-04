const { z } = require("zod");

const name = z.string().trim().min(1, "Plan name is required").max(100);

// Whole days, at least 1 (up to 10 years).
const durationDays = z
  .number({ message: "Duration must be a number" })
  .int("Duration must be a whole number of days")
  .min(1, "Duration must be at least 1 day")
  .max(3650, "Duration cannot be more than 3650 days");

// Price in minor units (e.g. paise), so there are no decimals to round.
const priceMinor = z
  .number({ message: "Price must be a number" })
  .int("Price must be a whole number of minor units")
  .min(0, "Price cannot be negative")
  .max(Number.MAX_SAFE_INTEGER, "Price is too large");

const maxFreezeDays = z
  .number({ message: "Max freeze days must be a number" })
  .int("Max freeze days must be a whole number")
  .min(0, "Max freeze days cannot be negative");

// Rule that depends on more than one field. Used on create and, after the
// changes are merged with the saved plan, on update.
const checkPlanRules = (data, ctx) => {
  if (
    data.max_freeze_days !== undefined &&
    data.duration_days !== undefined &&
    data.max_freeze_days > data.duration_days
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["max_freeze_days"],
      message: "Max freeze days cannot be more than the plan duration",
    });
  }
};

// branch_id and audit columns are set by the server, never by the client.
const createPlanSchema = z
  .object({
    name,
    duration_days: durationDays,
    price_minor: priceMinor,
    max_freeze_days: maxFreezeDays.default(0),
    is_active: z.boolean().default(true),
  })
  .superRefine(checkPlanRules);

// Every field optional. branch_id cannot be changed here. The cross-field
// rule is re-checked against the saved plan in the controller.
const updatePlanSchema = z
  .object({
    name,
    duration_days: durationDays,
    price_minor: priceMinor,
    max_freeze_days: maxFreezeDays,
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const updatePlanStatusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false" }),
});

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  checkPlanRules,
  createPlanSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
  formatZodError,
};
