import { useMemo, useState } from "react";

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

// Share of its slot a bar fills, the widest a bar gets (px) and its top corner
// radius (px).
const BAR_FILL = 0.6;
const MAX_BAR_WIDTH = 48;
const CORNER_RADIUS = 4;

// Bar with only the top corners rounded, so it sits flat on the baseline.
const getBarPath = (x, y, width, height) => {
  const radius = Math.min(CORNER_RADIUS, width / 2, height);

  return [
    `M ${x} ${y + height}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `H ${x + width - radius}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `V ${y + height}`,
    "Z",
  ].join(" ");
};

/**
 * Bar chart drawn with SVG (no chart library needed). Takes the same props as
 * AreaChart, so one can be swapped for the other.
 *
 * Props
 *   data          [{ [labelKey]: "05 Oct", [valueKey]: 4 }, ...]  (x order)
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
function BarChart({
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
  const [containerRef, width] = useElementWidth();
  const [activeIndex, setActiveIndex] = useState(null);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
  const baseY = MARGIN.top + innerHeight;

  // Every bar gets an equal slot; the bar sits in the middle of its slot.
  const slotWidth = data.length > 0 ? innerWidth / data.length : 0;

  const { bars, yMax } = useMemo(() => {
    const items = data.map((item) => ({
      label: item?.[labelKey],
      value: Number(item?.[valueKey]) || 0,
    }));

    const niceMax = getNiceMax(Math.max(0, ...items.map((item) => item.value)));
    const barWidth = Math.max(Math.min(slotWidth * BAR_FILL, MAX_BAR_WIDTH), 1);

    const plotted = items.map((item, index) => {
      const barHeight = (item.value / niceMax) * innerHeight;
      const centerX = MARGIN.left + slotWidth * (index + 0.5);

      return {
        ...item,
        x: centerX, // middle of the slot: x labels and tooltip follow it
        y: baseY - barHeight, // top of the bar: the tooltip sits above it
        barX: centerX - barWidth / 2,
        barWidth,
        barHeight,
      };
    });

    return { bars: plotted, yMax: niceMax };
  }, [data, labelKey, valueKey, slotWidth, innerHeight, baseY]);

  const hasData = bars.length > 0;

  const handleMouseMove = (event) => {
    if (!hasData || slotWidth === 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(
      (event.clientX - bounds.left - MARGIN.left) / slotWidth,
    );

    setActiveIndex(index >= 0 && index < bars.length ? index : null);
  };

  const active = activeIndex !== null ? bars[activeIndex] : null;

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
              aria-label="Bar chart"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <ChartGrid
                yMax={yMax}
                baseY={baseY}
                innerWidth={innerWidth}
                innerHeight={innerHeight}
                formatValue={formatValue}
              />

              <ChartXLabels
                points={bars}
                innerWidth={innerWidth}
                y={height - 8}
                formatLabel={formatLabel}
              />

              {/* Soft highlight behind the hovered slot */}
              {active && (
                <rect
                  x={MARGIN.left + slotWidth * activeIndex}
                  y={MARGIN.top}
                  width={slotWidth}
                  height={innerHeight}
                  fill="var(--muted)"
                  opacity={0.5}
                />
              )}

              {bars.map((bar, index) =>
                bar.barHeight > 0 ? (
                  <path
                    key={`${bar.label}-${index}`}
                    d={getBarPath(bar.barX, bar.y, bar.barWidth, bar.barHeight)}
                    fill={color}
                    fillOpacity={index === activeIndex ? 1 : 0.85}
                  />
                ) : null,
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

export default BarChart;
