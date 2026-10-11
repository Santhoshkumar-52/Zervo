import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

import { currency as envCurrency } from "@/utils/currency";

// Shared padding so every section of the sheet lines up.
export const SECTION_PADDING = "px-5 py-5 sm:px-8 sm:py-6";

// Shown wherever a value is missing.
export const EMPTY = "\u2014";

export const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Accepts a Date or an ISO / "YYYY-MM-DD" string. Returns null when invalid.
export const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(String(value));
  return isValid(date) ? date : null;
};

export const formatDate = (value, pattern = "d MMM yyyy") => {
  const date = toDate(value);
  return date ? format(date, pattern) : EMPTY;
};

// Money is held in minor units (paise). The branch decides the symbol;
// the env currency is the fallback.
export const createMoneyFormatter = (symbol) => {
  const prefix = symbol || envCurrency;

  return (minor) =>
    `${prefix}${((Number(minor) || 0) / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
};

export const getInitials = (firstName = "", lastName = "") =>
  `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase() || "?";

/**
 * Where "today" sits inside the membership period. Both end points count as
 * membership days (end date = start date + duration - 1), so a 92 day plan
 * covers 92 calendar days.
 *
 * `today` is passed in (not read here) so the result is predictable and the
 * component stays easy to test.
 */
export const getPeriod = (startValue, endValue, today) => {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return null;

  const totalDays = differenceInCalendarDays(end, start) + 1;
  const sinceStart = differenceInCalendarDays(today, start);
  const untilEnd = differenceInCalendarDays(end, today);

  let state = "active";
  let message;
  let progress;

  if (sinceStart < 0) {
    state = "upcoming";
    message = `Starts in ${plural(-sinceStart, "day")}`;
    progress = 0;
  } else if (untilEnd < 0) {
    state = "expired";
    message = `Ended ${plural(-untilEnd, "day")} ago`;
    progress = 100;
  } else {
    message = untilEnd === 0 ? "Ends today" : `${plural(untilEnd, "day")} left`;
    progress = Math.min(100, Math.max(0, ((sinceStart + 1) / totalDays) * 100));
  }

  return { start, end, totalDays, state, message, progress: Math.round(progress) };
};

// Matches the payments_status enum: draft | pending | cancelled | completed.
export const PAYMENT_STATUS = {
  completed: {
    label: "Paid",
    tone: "success",
    totalLabel: "Total paid",
    note: "Payment received. Thank you.",
  },
  pending: {
    label: "Payment pending",
    tone: "warning",
    totalLabel: "Total due",
    note: "Your membership is confirmed once payment is complete.",
  },
  draft: {
    label: "Draft",
    tone: "neutral",
    totalLabel: "Total due",
    note: "This bill hasn't been issued yet, so amounts may still change.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    totalLabel: "Total",
    note: "This bill was cancelled. Nothing is due.",
  },
};

export const getPaymentStatus = (status) =>
  PAYMENT_STATUS[status] ?? PAYMENT_STATUS.draft;
