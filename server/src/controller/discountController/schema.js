const { z } = require("zod");

// `type` is what the client sends (the select dropdown); `type_name` is
// hardcoded here and saved by the server, never accepted from the client.
const DISCOUNT_TYPES = {
  1: "percentage",
  2: "fixed",
};

const name = z.string().trim().min(1, "Discount name is required").max(100);

const type = z
  .number({ message: "Select a discount type" })
  .refine((value) => value === 1 || value === 2, {
    message: "Type must be 1 (percentage) or 2 (fixed)",
  });

// decimal(10,2): positive, at most 2 decimal places.
const value = z
  .number({ message: "Value must be a number" })
  .gt(0, "Value must be greater than 0")
  .max(99999999.99, "Value is too large")
  .refine((v) => Math.round(v * 100) / 100 === v, {
    message: "Value can have at most 2 decimal places",
  });

// Empty string clears the description.
const description = z.string().trim().max(255);

// Plain YYYY-MM-DD (the API returns dates in this format). null clears it.
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Not a valid date",
  });

// Rules that depend on more than one field. Used on create and, after the
// changes are merged with the saved discount, on update.
const checkDiscountRules = (data, ctx) => {
  if (data.type === 1 && data.value !== undefined && data.value > 100) {
    ctx.addIssue({
      code: "custom",
      path: ["value"],
      message: "Percentage cannot be more than 100",
    });
  }

  if (data.starts_on && data.ends_on && data.ends_on < data.starts_on) {
    ctx.addIssue({
      code: "custom",
      path: ["ends_on"],
      message: "End date cannot be before the start date",
    });
  }
};

// branch_id, type_name and audit columns are set by the server.
const createDiscountSchema = z
  .object({
    name,
    type,
    value,
    description: description.default(""),
    is_active: z.boolean().default(true),
    starts_on: date.nullable().optional(),
    ends_on: date.nullable().optional(),
  })
  .superRefine(checkDiscountRules);

// Every field optional. branch_id cannot be changed here. The cross-field
// rules are re-checked against the saved discount in the controller.
const updateDiscountSchema = z
  .object({
    name,
    type,
    value,
    description,
    is_active: z.boolean(),
    starts_on: date.nullable(),
    ends_on: date.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const updateDiscountStatusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false" }),
});

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  DISCOUNT_TYPES,
  checkDiscountRules,
  createDiscountSchema,
  updateDiscountSchema,
  updateDiscountStatusSchema,
  formatZodError,
};
