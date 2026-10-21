const { z } = require("zod");

// member_id is the member's own business ID (members.member_Id), the same
// number the attendance screen looks members up by. branch_id is NOT taken
// from the client; it comes from the logged-in user.
const checkInSchema = z.object({
  member_id: z.coerce
    .number({ message: "member_id must be a number" })
    .int("member_id must be a whole number")
    .positive("member_id must be greater than 0"),
});

// user_id is the staff member's own business ID (users.user_id), a string such
// as "STF-001". A number is accepted too and turned into a string. branch_id is
// NOT taken from the client; it comes from the logged-in user.
const checkInStaffSchema = z.object({
  user_id: z.preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    z
      .string({ message: "user_id is required" })
      .trim()
      .min(1, "user_id is required")
      .max(255, "user_id is too long"),
  ),
});

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  checkInSchema,
  checkInStaffSchema,
  formatZodError,
};
