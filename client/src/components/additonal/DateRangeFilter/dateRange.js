import { format, startOfMonth, startOfYear, subDays } from "date-fns";

// What the API / inputs store: "YYYY-MM-DD" (local date, no timezone shift).
export const DATE_FORMAT = "yyyy-MM-dd";

export const DATE_RANGE_PRESETS = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  LAST_7_DAYS: "last_7_days",
  LAST_14_DAYS: "last_14_days",
  THIS_MONTH: "this_month",
  THIS_YEAR: "this_year",
  CUSTOM: "custom",
};

export const DATE_RANGE_ITEMS = [
  { value: DATE_RANGE_PRESETS.TODAY, label: "Today" },
  { value: DATE_RANGE_PRESETS.YESTERDAY, label: "Yesterday" },
  { value: DATE_RANGE_PRESETS.LAST_7_DAYS, label: "Last 7 days" },
  { value: DATE_RANGE_PRESETS.LAST_14_DAYS, label: "Last 14 days" },
  { value: DATE_RANGE_PRESETS.THIS_MONTH, label: "This month" },
  { value: DATE_RANGE_PRESETS.THIS_YEAR, label: "This year" },
  { value: DATE_RANGE_PRESETS.CUSTOM, label: "Custom date" },
];

const toValue = (date) => format(date, DATE_FORMAT);

/**
 * Start / end date for a preset. Both days are included.
 *   - "Last N days" counts today as the last day (last 7 days = today - 6 ... today)
 *   - "This month" / "This year" run from the first day up to today
 * Returns null for "custom" (the user picks the dates).
 */
export function getPresetRange(preset, today = new Date()) {
  switch (preset) {
    case DATE_RANGE_PRESETS.TODAY:
      return { startDate: toValue(today), endDate: toValue(today) };

    case DATE_RANGE_PRESETS.YESTERDAY: {
      const yesterday = toValue(subDays(today, 1));

      return { startDate: yesterday, endDate: yesterday };
    }

    case DATE_RANGE_PRESETS.LAST_7_DAYS:
      return { startDate: toValue(subDays(today, 6)), endDate: toValue(today) };

    case DATE_RANGE_PRESETS.LAST_14_DAYS:
      return { startDate: toValue(subDays(today, 13)), endDate: toValue(today) };

    case DATE_RANGE_PRESETS.THIS_MONTH:
      return { startDate: toValue(startOfMonth(today)), endDate: toValue(today) };

    case DATE_RANGE_PRESETS.THIS_YEAR:
      return { startDate: toValue(startOfYear(today)), endDate: toValue(today) };

    default:
      return null;
  }
}

/**
 * Initial value for the filter:
 *   const [range, setRange] = useState(() => getDateRangeValue("last_7_days"));
 */
export function getDateRangeValue(
  preset = DATE_RANGE_PRESETS.LAST_7_DAYS,
  today = new Date(),
) {
  const range = getPresetRange(preset, today);

  return {
    preset,
    startDate: range?.startDate ?? "",
    endDate: range?.endDate ?? "",
  };
}

// Both dates filled and start <= end ("YYYY-MM-DD" strings compare correctly).
export function isValidDateRange({ startDate, endDate } = {}) {
  return Boolean(startDate && endDate && startDate <= endDate);
}
