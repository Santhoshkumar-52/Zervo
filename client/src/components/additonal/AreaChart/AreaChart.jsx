import { useEffect, useId, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";

import { cn } from "@/lib/utils";

const MARGIN = { top: 12, right: 12, bottom: 28, left: 40 };
const Y_TICKS = 4;

// "2026-10-05" -> "05 Oct". Anything that is not a date is shown as it is.
const defaultFormatLabel = (label) => {
  const date = typeof label === "string" ? parseISO(label) : null;

  return date && isValid(date) ? format(date, "dd MMM") : String(label ?? "");
};

const defaultFormatValue = (value) => value.toLocaleString();

// Round the top of the y axis up to a "nice" number (1, 2, 5 x 10^n) so the
// grid lines fall on whole values.
const getNiceMax = (max) => {
  if (max <= 0) return Y_TICKS;

  const step = max / Y_TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const normalized = step / magnitude;

  const niceStep =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;

  return Math.max(niceStep * Y_TICKS, 1);
};

// Smooth line through the points. The control points sit at the middle of each
// segment with the same height as their point, so the curve never overshoots
// the data.
const getLinePath = (points) =>
  points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;

    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, "");

/**
 * Area chart drawn with SVG (no chart library needed).
 *
 * Props
 *   data          [{ [labelKey]: "2026-10-01", [valueKey]: 4 }, ...]  (x order)
 *   labelKey      field used for the x axis labels            (default "date")
 *   valueKey      field used for the y axis values            (default "value")
 *   height        chart height in px                           (default 260)
 *   color         any CSS colour; follows the theme by default
 *   formatLabel   (label) => string, for the x axis and the tooltip
 *   formatValue   (value) => string, for the y axis and the tooltip
 *   valueLabel    name shown next to the value in the tooltip  (default "Value")
 *   emptyMessage  shown when data is empty
 *   className     extra classes for the wrapper
 */
function AreaChart({
  data = [],
  labelKey = "date",
  valueKey = "value",
  height = 260,
  color = "var(--primary)",
  formatLabel = defaultFormatLabel,
  formatValue = defaultFormatValue,
  valueLabel = "Value",
  emptyMessage = "No data for the selected dates.",
  className,
}) {
  const gradientId = useId();
  const containerRef = useRef(null);

  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);

  // Follow the width of the parent so the chart is responsive.
  useEffect(() => {
    const element = containerRef.current;

    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
  const baseY = MARGIN.top + innerHeight;

  const { points, yMax } = useMemo(() => {
    const items = data.map((item) => ({
      label: item?.[labelKey],
      value: Number(item?.[valueKey]) || 0,
    }));

    const niceMax = getNiceMax(Math.max(0, ...items.map((item) => item.value)));

    const plotted = items.map((item, index) => ({
      ...item,
      // One point sits in the middle; more points span the full width.
      x:
        items.length === 1
          ? MARGIN.left + innerWidth / 2
          : MARGIN.left + (index / (items.length - 1)) * innerWidth,
      y: MARGIN.top + innerHeight - (item.value / niceMax) * innerHeight,
    }));

    return { points: plotted, yMax: niceMax };
  }, [data, labelKey, valueKey, innerWidth, innerHeight]);

  const hasData = points.length > 0;

  const linePath = getLinePath(points);

  const areaPath = hasData
    ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
    : "";

  // Show only as many x labels as fit, evenly spaced.
  const labelEvery = Math.max(Math.ceil(points.length / Math.max(Math.floor(innerWidth / 72), 1)), 1);

  const handleMouseMove = (event) => {
    if (!hasData) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;

    let nearest = 0;

    points.forEach((point, index) => {
      if (Math.abs(point.x - pointerX) < Math.abs(points[nearest].x - pointerX)) {
        nearest = index;
      }
    });

    setActiveIndex(nearest);
  };

  const active = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ height }}
    >
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        width > 0 && (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label="Area chart"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines + y axis values */}
              {Array.from({ length: Y_TICKS + 1 }, (_, index) => {
                const value = (yMax / Y_TICKS) * index;
                const y = baseY - (index / Y_TICKS) * innerHeight;

                return (
                  <g key={index}>
                    <line
                      x1={MARGIN.left}
                      x2={MARGIN.left + innerWidth}
                      y1={y}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray={index === 0 ? undefined : "3 3"}
                    />
                    <text
                      x={MARGIN.left - 8}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {formatValue(value)}
                    </text>
                  </g>
                );
              })}

              {/* x axis labels */}
              {points.map((point, index) =>
                index % labelEvery === 0 ? (
                  <text
                    key={`${point.label}-${index}`}
                    x={point.x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {formatLabel(point.label)}
                  </text>
                ) : null,
              )}

              <path d={areaPath} fill={`url(#${gradientId})`} />

              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* A single day has no line to draw, so show its dot */}
              {points.length === 1 && (
                <circle cx={points[0].x} cy={points[0].y} r={3.5} fill={color} />
              )}

              {active && (
                <g>
                  <line
                    x1={active.x}
                    x2={active.x}
                    y1={MARGIN.top}
                    y2={baseY}
                    stroke={color}
                    strokeOpacity={0.4}
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={active.x}
                    cy={active.y}
                    r={4.5}
                    fill="var(--background)"
                    stroke={color}
                    strokeWidth={2}
                  />
                </g>
              )}
            </svg>

            {active && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                style={{
                  left: Math.min(Math.max(active.x, 56), width - 56),
                  top: Math.max(active.y - 12, 0),
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="text-muted-foreground">
                  {formatLabel(active.label)}
                </div>
                <div className="font-medium">
                  {valueLabel}: {formatValue(active.value)}
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

export default AreaChart;
