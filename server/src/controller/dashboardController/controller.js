const { successResponse, errorResponse } = require("../../utils/response");
const {
  reportRangeSchema,
  formatZodError,
} = require("../reportController/schema");
const { findSubscriptionTrend } = require("./dashboardStore");
const { buildTrend } = require("./trend");

// ---------------------------------------------------------------------------
// Loaders: one promise-returning function per dashboard widget. Each gets
// { branchId, startDate, endDate } and resolves with its data or rejects with
// an error. Add a new loader here and register it in `loaders` below.
// ---------------------------------------------------------------------------

// Turns a per-day query into a chart loader. `findDailyRows` is a store
// function (branchId, { startDate, endDate }) that resolves with one
// { date, value } row per day. The rows are grouped by day, week, month or
// year depending on the length of the range (see trend.js).
// -> { group_by, points: [{ label, start_date, end_date, value }] }
const trendLoader = (findDailyRows) => async (params) =>
  buildTrend(await findDailyRows(params.branchId, params), params);

// key -> loader. The key becomes the property name in the response.
const loaders = {
  subscriptions: trendLoader(findSubscriptionTrend),
  // revenue: trendLoader(findRevenueTrend),   <- add more charts here
};

// GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// body: { start_date, end_date } also works, for clients that can send a GET
// body (same as the reports). Both days are included.
// Runs every loader together for the logged-in user's branch. Promise.all only
// resolves when ALL of them succeed; if any one rejects, the whole request
// fails (nothing partial is sent).
// -> { subscriptions: { group_by, points: [{ label, start_date, end_date, value }] } }
const getDashboard = async (req, res) => {
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

    const params = {
      branchId: req.user.branchId,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
    };

    const keys = Object.keys(loaders);

    const results = await Promise.all(keys.map((key) => loaders[key](params)));

    // Rebuild { subscriptions: {...}, ... } from the results (same order as keys)
    const data = keys.reduce((acc, key, index) => {
      acc[key] = results[index];
      return acc;
    }, {});

    return successResponse(res, data, "Dashboard data fetched successfully");
  } catch (error) {
    console.error("Error fetching dashboard data:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  getDashboard,
};
