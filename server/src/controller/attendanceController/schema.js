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

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  checkInSchema,
  formatZodError,
};
