const { successResponse, errorResponse } = require("../../utils/response");
const {
  reportRangeSchema,
  formatZodError,
} = require("../reportController/schema");
const {
  findSubscriptionTrend,
  findSalesTrend,
  findSalesSeries,
  findPaymentModes,
} = require("./dashboardStore");
const { buildTrend } = require("./trend");

// ---------------------------------------------------------------------------
// Loaders: one promise-returning function per dashboard widget. Each gets
// { branchId, startDate, endDate } and resolves with its data or rejects with
// an error. Add a new loader here and register it in `loaders` below.
// ---------------------------------------------------------------------------

// Turns a per-day query into a chart loader.
//   findDailyRows  store function (branchId, { startDate, endDate }) that
//                  resolves with one { date, value } row per day. Add a `key`
//                  to each row to split the chart into parts.
//   findSeries     optional, for charts split into parts: (branchId, rows)
//                  resolves with the parts [{ key, name }] in display order.
// The rows are grouped by day, week, month or year depending on the length of
// the range (see trend.js).
// -> { group_by, points: [{ label, start_date, end_date, value, breakdown? }],
//      series? }
const trendLoader = (findDailyRows, findSeries) => async (params) => {
  const rows = await findDailyRows(params.branchId, params);
  const trend = buildTrend(rows, params);

  if (!findSeries) return trend;

  return { ...trend, series: await findSeries(params.branchId, rows) };
};

// Payment modes in the range: how many bills each mode paid and the money it
// received (paise). Not a trend, so it skips the day/week/month grouping.
// -> [{ id, name, count, amount }]   (every mode of the branch, 0 when unused)
const paymentModeLoader = (params) =>
  findPaymentModes(params.branchId, params);

// key -> loader. The key becomes the property name in the response.
const loaders = {
  // Bills per period
  subscriptions: trendLoader(findSubscriptionTrend),
  // Sales per period, split by plan (paise, tax included)
  revenue: trendLoader(findSalesTrend, findSalesSeries),
  // Bill count and amount received per payment mode, for the whole range
  payment_modes: paymentModeLoader,
  // attendance: trendLoader(findAttendanceTrend),   <- add more charts here
};

// GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// body: { start_date, end_date } also works, for clients that can send a GET
// body (same as the reports). Both days are included.
// Runs every loader together for the logged-in user's branch. Promise.all only
// resolves when ALL of them succeed; if any one rejects, the whole request
// fails (nothing partial is sent).
// -> { subscriptions: { group_by, points },
//      revenue: { group_by, points, series },   (see trendLoader)
//      payment_modes: [{ id, name, count, amount }] }
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
