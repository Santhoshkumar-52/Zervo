const { z } = require("zod");

const name = z.string().trim().min(1, "Tax name is required").max(100);

// decimal(5,2): 0 - 100 with at most 2 decimal places.
const rate = z
  .number({ message: "Rate must be a number" })
  .min(0, "Rate must be between 0 and 100")
  .max(100, "Rate must be between 0 and 100")
  .refine((value) => Math.round(value * 100) / 100 === value, {
    message: "Rate can have at most 2 decimal places",
  });

// Empty string clears the description.
const description = z.string().trim().max(255);

// branch_id and audit columns are set by the server, never by the client.
const createTaxSchema = z.object({
  name,
  rate,
  description: description.default(""),
  is_active: z.boolean().default(true),
});

// Every field optional. branch_id cannot be changed here.
const updateTaxSchema = z
  .object({
    name,
    rate,
    description,
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const updateTaxStatusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false" }),
});

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  createTaxSchema,
  updateTaxSchema,
  updateTaxStatusSchema,
  formatZodError,
};
