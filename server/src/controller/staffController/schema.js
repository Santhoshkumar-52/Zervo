const { z } = require("zod");

const ROLES = ["owner", "manager", "front_desk", "trainer"];

// Fields shared by create + update.
const fullName = z.string().trim().min(1, "Full name is required").max(100);
const email = z.string().trim().toLowerCase().email("Invalid email").max(150);
const password = z.string().min(8, "Password must be at least 8 characters").max(100);
const avatarUrl = z.string().trim().max(500).nullable();

// Mobile number: digits with an optional leading +, spaces, dashes and
// brackets (same characters as members.phone), 7 to 15 digits in total.
const phone = z
  .string({ message: "Mobile number is required" })
  .trim()
  .min(1, "Mobile number is required")
  .regex(/^\+?[0-9\-\s()]{7,20}$/, "Enter a valid mobile number")
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    },
    { message: "Mobile number must have 7 to 15 digits" },
  );

// Optional: null clears it. Same values as the users.gender column.
const GENDERS = ["male", "female", "others"];
const gender = z.enum(GENDERS).nullable();

// The staff member's group (role): groups.id. The controller checks that it exists.
const group_id = z
  .number({ message: "group_id is required" })
  .int("group_id must be a whole number")
  .positive("group_id must be a valid group id");

// user_id comes from the client (business ID), it is not generated here.
const createStaffSchema = z.object({
  user_id: z.string().trim().min(1, "User ID is required").max(255),
  full_name: fullName,
  email,
  phone,
  password,
  group_id: group_id,
  gender: gender.optional(),
  is_active: z.boolean().default(true),
  avatar_url: avatarUrl.optional(),
});

// Every field optional; user_id and branch_id cannot be changed.
const updateStaffSchema = z
  .object({
    full_name: fullName,
    email,
    phone,
    password,
    group_id: group_id,
    gender,
    is_active: z.boolean(),
    avatar_url: avatarUrl,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

// PATCH /api/staff/:id/status body: { is_active }
const updateStaffStatusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false" }),
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
  updateStaffStatusSchema,
  formatZodError,
};
