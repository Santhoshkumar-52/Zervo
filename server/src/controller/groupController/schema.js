const { z } = require("zod");

const name = z.string().trim().min(1, "Group name is required").max(50);

// Empty string clears the description.
const description = z.string().trim().max(255);

// Audit columns are set by the server, never by the client.
const createGroupSchema = z.object({
  name,
  description: description.default(""),
  is_active: z.boolean().default(true),
});

// Every field optional.
const updateGroupSchema = z
  .object({
    name,
    description,
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const updateGroupStatusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false" }),
});

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  updateGroupStatusSchema,
  formatZodError,
};
