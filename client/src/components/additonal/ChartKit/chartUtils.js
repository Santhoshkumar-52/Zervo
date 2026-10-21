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

// Colours for the parts of a split chart (for example one per plan). They come
// from the theme, so they follow the selected theme and light / dark mode.
const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const getSeriesColor = (index) =>
  SERIES_COLORS[index % SERIES_COLORS.length];

// ---------------------------------------------------------------------------
// Round charts (pie, stacked pie). Angle 0 is the top and angles run clockwise.
// ---------------------------------------------------------------------------

export const FULL_TURN = 360;

// A slice that is the whole circle cannot be drawn as one arc (start = end), so
// it stops a hair short of a full turn.
const ALMOST_FULL_TURN = 359.999;

export const toPoint = (cx, cy, radius, angle) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
};

// One slice as an SVG path. With `innerRadius` 0 it is a pie wedge, otherwise a
// ring segment (donut).
export const getSlicePath = (
  cx,
  cy,
  outerRadius,
  innerRadius,
  startAngle,
  endAngle,
) => {
  const sweep = Math.min(endAngle - startAngle, ALMOST_FULL_TURN);
  const end = startAngle + sweep;
  const largeArc = sweep > FULL_TURN / 2 ? 1 : 0;

  const [outerStartX, outerStartY] = toPoint(cx, cy, outerRadius, startAngle);
  const [outerEndX, outerEndY] = toPoint(cx, cy, outerRadius, end);

  if (innerRadius <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStartX} ${outerStartY}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
      "Z",
    ].join(" ");
  }

  const [innerStartX, innerStartY] = toPoint(cx, cy, innerRadius, startAngle);
  const [innerEndX, innerEndY] = toPoint(cx, cy, innerRadius, end);

  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ");
};