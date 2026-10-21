// Groups per-day numbers into the points of a dashboard chart.
//
// The server picks the grouping from the length of the range, so every chart
// gets a readable number of points (roughly 5 to 30):
//
//   up to 31 days   -> "day"    Today, Last 7 days, Last 14 days, This month
//   up to 120 days  -> "week"   Last 3 months, most custom ranges
//   up to 548 days  -> "month"  Last 6 months, This year, Last 12 months
//   longer          -> "year"   Last 2 years and more
//
// Every bucket in the range is returned, also the empty ones (value 0), so the
// x axis has no gaps. The first and last bucket are cut at the range edges, so
// the points always add up to exactly the selected period.
//
// Works for any chart: load one { date, value } row per day (days without data
// may be missing), then group them. Counts and amounts both work, because a
// bucket is simply the sum of its days.
//
//   buildTrend(dailyRows, { startDate, endDate })

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

// Longest range (in days) shown with each grouping, shortest grouping first.
// A range longer than the last limit is grouped by year.
const GROUP_LIMITS = [
  { groupBy: "day", maxDays: 31 },
  { groupBy: "week", maxDays: 120 },
  { groupBy: "month", maxDays: 548 },
];

const LONGEST_GROUP = "year";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ---------------------------------------------------------------------------
// Dates. "YYYY-MM-DD" strings are turned into UTC milliseconds, which keeps the
// maths free of timezone and daylight saving shifts.
// ---------------------------------------------------------------------------

const toMs = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
};

const toDateString = (ms) => new Date(ms).toISOString().slice(0, 10);

const addDays = (ms, days) => ms + days * DAY_MS;

const endOfMonth = (ms) => {
  const date = new Date(ms);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
};

const endOfYear = (ms) => Date.UTC(new Date(ms).getUTCFullYear(), 11, 31);

const countDays = (startDate, endDate) =>
  Math.round((toMs(endDate) - toMs(startDate)) / DAY_MS) + 1;

// ---------------------------------------------------------------------------
// Labels for the x axis.
// ---------------------------------------------------------------------------

const pad = (number) => String(number).padStart(2, "0");

// "05 Oct"
const dayLabel = (ms) => {
  const date = new Date(ms);

  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]}`;
};

// "01-07 Oct" inside one month, "28 Oct - 03 Nov" across two months.
const weekLabel = (startMs, endMs) => {
  if (startMs === endMs) return dayLabel(startMs);

  const start = new Date(startMs);
  const end = new Date(endMs);

  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${pad(start.getUTCDate())}-${pad(end.getUTCDate())} ${
      MONTHS[end.getUTCMonth()]
    }`;
  }

  return `${dayLabel(startMs)} - ${dayLabel(endMs)}`;
};

// "Oct", or "Oct 2026" when the range covers more than one year.
const monthLabel = (ms, spansYears) => {
  const date = new Date(ms);
  const name = MONTHS[date.getUTCMonth()];

  return spansYears ? `${name} ${date.getUTCFullYear()}` : name;
};

// "2026"
const yearLabel = (ms) => String(new Date(ms).getUTCFullYear());

// ---------------------------------------------------------------------------
// Groupings. To add one, add an entry here and a row in GROUP_LIMITS.
//   end    last day of the bucket that starts at `startMs`
//   label  text for the x axis (receives the bucket as cut by the range)
//
// A week is 7 days counted from the first day of the range (not Monday to
// Sunday), so every week is the same size and the chart has no false dips.
// ---------------------------------------------------------------------------

const GROUPINGS = {
  day: {
    end: (startMs) => startMs,
    label: (startMs) => dayLabel(startMs),
  },
  week: {
    end: (startMs) => addDays(startMs, WEEK_DAYS - 1),
    label: (startMs, endMs) => weekLabel(startMs, endMs),
  },
  month: {
    end: endOfMonth,
    label: (startMs, _endMs, spansYears) => monthLabel(startMs, spansYears),
  },
  year: {
    end: endOfYear,
    label: (startMs) => yearLabel(startMs),
  },
};

// "day" | "week" | "month" | "year" for a range (both days included).
const getGroupBy = (startDate, endDate) => {
  const days = countDays(startDate, endDate);
  const match = GROUP_LIMITS.find((limit) => days <= limit.maxDays);

  return match ? match.groupBy : LONGEST_GROUP;
};

// The empty points of the range, oldest first.
const buildBuckets = (groupBy, startDate, endDate) => {
  const { end, label } = GROUPINGS[groupBy];

  const startMs = toMs(startDate);
  const endMs = toMs(endDate);
  const spansYears =
    new Date(startMs).getUTCFullYear() !== new Date(endMs).getUTCFullYear();

  const buckets = [];

  for (let cursor = startMs; cursor <= endMs; ) {
    // Cut the last bucket at the end of the range.
    const bucketEnd = Math.min(end(cursor), endMs);

    buckets.push({
      label: label(cursor, bucketEnd, spansYears),
      start_date: toDateString(cursor),
      end_date: toDateString(bucketEnd),
      value: 0,
    });

    cursor = addDays(bucketEnd, 1);
  }

  return buckets;
};

/**
 * dailyRows: [{ date: "YYYY-MM-DD", value }]  one per day, days without data
 *            may be missing
 *
 * Returns
 *   {
 *     group_by: "day" | "week" | "month" | "year",
 *     points: [{
 *       label,       text for the x axis
 *       start_date,  first day of the point (YYYY-MM-DD)
 *       end_date,    last day of the point (YYYY-MM-DD)
 *       value,       sum of the days inside the point
 *     }]
 *   }
 */
const buildTrend = (dailyRows, { startDate, endDate }) => {
  const groupBy = getGroupBy(startDate, endDate);
  const points = buildBuckets(groupBy, startDate, endDate);

  dailyRows.forEach(({ date, value }) => {
    // "YYYY-MM-DD" strings compare correctly as text.
    const point = points.find(
      (item) => date >= item.start_date && date <= item.end_date,
    );

    if (point) point.value += Number(value) || 0;
  });

  return { group_by: groupBy, points };
};

module.exports = {
  getGroupBy,
  buildTrend,
};
