const { z } = require("zod");

const { parseDateOnly } = require("../../utils/billing");

const dateOnly = (label) =>
  z
    .string({ message: `${label} is required` })
    .refine((value) => parseDateOnly(value) !== null, {
      message: `${label} must be a valid date (YYYY-MM-DD)`,
    });

// What the client sends to fetch a report for a date range (both days
// included). Page, limit and search travel in the query string.
const reportRangeSchema = z
  .object({
    start_date: dateOnly("Start date"),
    end_date: dateOnly("End date"),
  })
  .refine((data) => data.start_date <= data.end_date, {
    path: ["end_date"],
    message: "End date cannot be before the start date",
  });

const formatZodError = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

module.exports = {
  reportRangeSchema,
  formatZodError,
};
