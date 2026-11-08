const { z } = require("zod");

// Allowed values mirror the enu() columns in
// 20261002120000_create_branches_table.js. Keep them in sync.
const SUBBILL_URLS = ["summary-bill", "diwali", "pongal"];
const RECEIPT_URLS = ["receipt-bill", "diwali", "pongal"];

const name = z.string().trim().min(1, "Branch name is required").max(150);
const code = z.string().trim().min(1, "Branch code is required").max(50);
const currency = z.string().trim().min(1, "Currency is required").max(20);
const url = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .max(2083, "URL is too long");

// Empty string clears the value (stored as NULL).
const address = z.string().trim().max(255);
const phone = z
  .string()
  .trim()
  .max(20, "Phone can be at most 20 characters")
  .regex(/^[0-9+\-()\s]*$/, "Phone can only contain digits, + - ( ) and spaces");

// Every field optional; id and the timestamps cannot be changed here.
const updateBranchSchema = z
  .object({
    name,
    code,
    logo: url,
    attend_background: url,
    address,
    phone,
    currency,
    subbill_url: z.enum(SUBBILL_URLS, {
      message: `Bill page must be one of: ${SUBBILL_URLS.join(", ")}`,
    }),
    receipt_url: z.enum(RECEIPT_URLS, {
      message: `Receipt page must be one of: ${RECEIPT_URLS.join(", ")}`,
    }),
    is_active: z.boolean({ message: "is_active must be true or false" }),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  SUBBILL_URLS,
  RECEIPT_URLS,
  updateBranchSchema,
  formatZodError,
};
