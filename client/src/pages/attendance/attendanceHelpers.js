import { format, isValid, parseISO } from "date-fns";

// Shown when a member record has no value for a field.
export const EMPTY_VALUE = "\u2014";

export const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// "2026-10-01" -> "01 Oct 2026". parseISO reads a date-only string as local
// time, so the day never shifts with the viewer's timezone.
export const formatDate = (value) => {
  if (!value) return EMPTY_VALUE;

  const date = parseISO(value);

  return isValid(date) ? format(date, "dd MMM yyyy") : EMPTY_VALUE;
};

// ISO timestamp -> "6:42 PM" in the viewer's local time.
export const formatTime = (value) => {
  const date = new Date(value);

  return isValid(date) ? format(date, "h:mm a") : EMPTY_VALUE;
};
