const { z } = require("zod");

const firstName = z.string().trim().min(1, "First name is required").max(100);
const lastName = z.string().trim().max(100);

// Same rule the edit dialog uses on the client.
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number");

// Optional: null clears the email.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email")
  .max(255)
  .nullable();

// Plain YYYY-MM-DD (the list endpoint returns dates in this format).
const joinedOn = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Joined date must be YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Joined date is not a valid date",
  });

const trainerId = z.number().int().positive().nullable();

// member_Id and branch_id are set by the server, never by the client.
const createMemberSchema = z.object({
  first_name: firstName,
  last_name: lastName.default(""),
  phone,
  email: email.optional(),
  joined_on: joinedOn,
  assigned_trainer_id: trainerId.optional(),
  is_active: z.boolean().default(true),
});

// Every field optional. member_Id / branch_id cannot be changed here.
const updateMemberSchema = z
  .object({
    first_name: firstName,
    last_name: lastName,
    phone,
    email,
    joined_on: joinedOn,
    assigned_trainer_id: trainerId,
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const updateMemberStatusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false" }),
});

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  createMemberSchema,
  updateMemberSchema,
  updateMemberStatusSchema,
  formatZodError,
};
