const { successResponse, errorResponse } = require("../../utils/response");
const { reportRangeSchema, formatZodError } = require("./schema");
const {
  findAttendanceReport,
  findStaffAttendanceReport,
} = require("./reportStore");

// GET /api/report/attendance?page&limit&search
// body: { start_date, end_date } (YYYY-MM-DD, compared with the check-in time,
// both days included). Clients that cannot send a body on GET (browser fetch,
// axios) may send start_date and end_date in the query string instead.
// Lists the logged-in user's branch member check-ins, newest first. page
// defaults to 1 and limit to 10 (max 100); search matches the member's
// member_Id, phone or name.
const getAttendanceReport = async (req, res) => {
  try {
    const parsed = reportRangeSchema.safeParse({
      start_date: req.body?.start_date ?? req.query.start_date,
      end_date: req.body?.end_date ?? req.query.end_date,
    });

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = req.query.search?.trim() || "";

    const { records, total } = await findAttendanceReport(branchId, {
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      search,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      res,
      {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Attendance report fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching attendance report:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// GET /api/report/staff-attendance?page&limit&search
// Same as the member attendance report, for staff check-ins. The date range
// (start_date, end_date) is read from the body or the query string. search
// matches the staff user ID, name, email or group name.
const getStaffAttendanceReport = async (req, res) => {
  try {
    const parsed = reportRangeSchema.safeParse({
      start_date: req.body?.start_date ?? req.query.start_date,
      end_date: req.body?.end_date ?? req.query.end_date,
    });

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const search = req.query.search?.trim() || "";

    const { records, total } = await findStaffAttendanceReport(branchId, {
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      search,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      res,
      {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Staff attendance report fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching staff attendance report:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getAttendanceReport,
  getStaffAttendanceReport,
};
