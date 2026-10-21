import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ChartGrid,
  ChartTooltip,
  ChartXLabels,
  MARGIN,
  defaultFormatLabel,
  defaultFormatValue,
  getNiceMax,
  useElementWidth,
} from "@/components/additonal/ChartKit";

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
  const [containerRef, width] = useElementWidth();
  const [activeIndex, setActiveIndex] = useState(null);

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

              <ChartGrid
                yMax={yMax}
                baseY={baseY}
                innerWidth={innerWidth}
                innerHeight={innerHeight}
                formatValue={formatValue}
              />

              <ChartXLabels
                points={points}
                innerWidth={innerWidth}
                y={height - 8}
                formatLabel={formatLabel}
              />

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
              <ChartTooltip
                point={active}
                width={width}
                valueLabel={valueLabel}
                formatLabel={formatLabel}
                formatValue={formatValue}
              />
            )}
          </>
        )
      )}
    </div>
  );
}

export default AreaChart;
