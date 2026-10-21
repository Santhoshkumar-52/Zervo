import { format, isValid, parseISO } from "date-fns";

// Space around the plot, inside the SVG (room for the axis labels).
export const MARGIN = { top: 12, right: 12, bottom: 28, left: 40 };

// Number of horizontal grid lines above the baseline.
export const Y_TICKS = 4;

// Least width (px) one x axis label needs.
const X_LABEL_WIDTH = 72;

// "2026-10-05" -> "05 Oct". Anything that is not a date is shown as it is.
export const defaultFormatLabel = (label) => {
  const date = typeof label === "string" ? parseISO(label) : null;

  return date && isValid(date) ? format(date, "dd MMM") : String(label ?? "");
};

export const defaultFormatValue = (value) => value.toLocaleString();

// Round the top of the y axis up to a "nice" number (1, 2, 5 x 10^n) so the
// grid lines fall on whole values.
export const getNiceMax = (max) => {
  if (max <= 0) return Y_TICKS;

  const step = max / Y_TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const normalized = step / magnitude;

  const niceStep =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;

  return Math.max(niceStep * Y_TICKS, 1);
};

// Show every n-th x label so only as many labels as fit are drawn.
export const getLabelEvery = (pointCount, innerWidth) => {
  const fit = Math.max(Math.floor(innerWidth / X_LABEL_WIDTH), 1);

  return Math.max(Math.ceil(pointCount / fit), 1);
};
