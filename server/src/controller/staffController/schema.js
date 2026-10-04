const { z } = require("zod");

const ROLES = ["owner", "manager", "front_desk", "trainer"];

// Fields shared by create + update.
const fullName = z.string().trim().min(1, "Full name is required").max(100);
const email = z.string().trim().toLowerCase().email("Invalid email").max(150);
const password = z.string().min(8, "Password must be at least 8 characters").max(100);
const avatarUrl = z.string().trim().max(500).nullable();

// user_id comes from the client (business ID), it is not generated here.
const createStaffSchema = z.object({
  user_id: z.string().trim().min(1, "User ID is required").max(255),
  full_name: fullName,
  email,
  password,
  role: z.enum(ROLES).default("front_desk"),
  is_active: z.boolean().default(true),
  avatar_url: avatarUrl.optional(),
});

// Every field optional; user_id and branch_id cannot be changed.
const updateStaffSchema = z
  .object({
    full_name: fullName,
    email,
    password,
    role: z.enum(ROLES),
    is_active: z.boolean(),
    avatar_url: avatarUrl,
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
  ROLES,
  createStaffSchema,
  updateStaffSchema,
  formatZodError,
};
