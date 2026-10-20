// Turns per-day numbers into the points of a dashboard chart.
//
// The server decides how to group the days from the length of the range, so
// the chart always has a readable number of points:
//
//   up to 14 days   -> "day"    Last 7 days, Last 14 days, Today ...
//   up to ~3 months -> "week"   This month, most custom ranges
//   longer          -> "month"  This year, long custom ranges
//
// Every bucket in the range is returned, also the empty ones (bills = 0), so
// the x axis has no gaps.

const DAY_MS = 24 * 60 * 60 * 1000;

// Longest range (in days) that is still shown per day / per week.
const MAX_DAYS_FOR_DAY = 14;
const MAX_DAYS_FOR_WEEK = 92;

const WEEK_DAYS = 7;

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

// "YYYY-MM-DD" <-> UTC milliseconds. UTC keeps the maths free of timezone and
// daylight saving shifts.
const toMs = (value) => {
  const [year, month, day] = value.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
};

const toDateString = (ms) => new Date(ms).toISOString().slice(0, 10);

const addDays = (ms, days) => ms + days * DAY_MS;

const pad = (number) => String(number).padStart(2, "0");

// Last day of the month that `ms` falls in.
const endOfMonthMs = (ms) => {
  const date = new Date(ms);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
};

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
const monthLabel = (ms, withYear) => {
  const date = new Date(ms);
  const name = MONTHS[date.getUTCMonth()];

  return withYear ? `${name} ${date.getUTCFullYear()}` : name;
};

const countDays = (startDate, endDate) =>
  Math.round((toMs(endDate) - toMs(startDate)) / DAY_MS) + 1;

// "day" | "week" | "month" for a range (both days included).
const getGroupBy = (startDate, endDate) => {
  const days = countDays(startDate, endDate);

  if (days <= MAX_DAYS_FOR_DAY) return "day";
  if (days <= MAX_DAYS_FOR_WEEK) return "week";

  return "month";
};

// The empty buckets of the range: [{ label, startMs, endMs }]
const buildBuckets = (groupBy, startDate, endDate) => {
  const startMs = toMs(startDate);
  const endMs = toMs(endDate);
  const spansYears =
    new Date(startMs).getUTCFullYear() !== new Date(endMs).getUTCFullYear();

  const buckets = [];

  for (let cursor = startMs; cursor <= endMs; ) {
    let bucketEnd;
    let label;

    if (groupBy === "day") {
      bucketEnd = cursor;
      label = dayLabel(cursor);
    } else if (groupBy === "week") {
      bucketEnd = Math.min(addDays(cursor, WEEK_DAYS - 1), endMs);
      label = weekLabel(cursor, bucketEnd);
    } else {
      bucketEnd = Math.min(endOfMonthMs(cursor), endMs);
      label = monthLabel(cursor, spansYears);
    }

    buckets.push({ label, startMs: cursor, endMs: bucketEnd });

    cursor = addDays(bucketEnd, 1);
  }

  return buckets;
};

/**
 * dailyRows: [{ date: "YYYY-MM-DD", bills, total }]  (days without bills may
 *            be missing)
 *
 * Returns
 *   {
 *     group_by: "day" | "week" | "month",
 *     points: [{
 *       label,       text for the x axis
 *       start_date,  first day of the bucket (YYYY-MM-DD)
 *       end_date,    last day of the bucket (YYYY-MM-DD)
 *       value,       total amount of the bills, in paise (y axis)
 *       bills,       number of bills
 *     }]
 *   }
 */
const buildTrend = (dailyRows, { startDate, endDate }) => {
  const groupBy = getGroupBy(startDate, endDate);

  const points = buildBuckets(groupBy, startDate, endDate).map((bucket) => ({
    label: bucket.label,
    start_date: toDateString(bucket.startMs),
    end_date: toDateString(bucket.endMs),
    value: 0,
    bills: 0,
  }));

  // Rows and points are both in date order, so one pass is enough.
  let index = 0;

  dailyRows.forEach((row) => {
    while (index < points.length - 1 && row.date > points[index].end_date) {
      index += 1;
    }

    points[index].value += row.total;
    points[index].bills += row.bills;
  });

  return { group_by: groupBy, points };
};

module.exports = {
  getGroupBy,
  buildBuckets,
  buildTrend,
};
