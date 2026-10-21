import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ChartLegend,
  ChartTooltipBox,
  defaultFormatValue,
  getSeriesColor,
  useElementWidth,
} from "@/components/additonal/ChartKit";

// Layout (px).
const DEFAULT_HEIGHT = 260; // same as the area chart, so cards line up
const LEGEND_HEIGHT = 24; // legend row above the pie (text-xs + pb-2)
const PADDING = 8; // room around the pie for the hover pop-out
const HOVER_POP = 4; // how far the hovered slice moves outwards
const DONUT_HOLE = 0.6; // hole size as a share of the radius

const FULL_TURN = 360;
// A slice that is the whole pie cannot be drawn as one arc (start = end), so
// it stops a hair short of a full turn.
const ALMOST_FULL_TURN = 359.999;

const NO_DATA = [];

// Angle 0 is the top of the pie and angles run clockwise.
const toPoint = (cx, cy, radius, angle) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
};

// One slice as an SVG path. With `innerRadius` 0 it is a pie wedge, otherwise
// a ring segment (donut).
const getSlicePath = (cx, cy, outerRadius, innerRadius, startAngle, endAngle) => {
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

// 42.5 -> "42.5%", 50 -> "50%"
const formatPercent = (percent) => `${Math.round(percent * 10) / 10}%`;

/**
 * Pie (or donut) chart drawn with SVG (no chart library needed). Every data
 * item is one slice, in the order given, starting at the top and going
 * clockwise. Items without a positive value are left out. A legend above the
 * pie names each slice with its share.
 *
 * Props
 *   data          [{ [labelKey]: "Cash", [valueKey]: 150000, color? }, ...]
 *   labelKey      field used for the slice names               (default "label")
 *   valueKey      field used for the slice size                (default "value")
 *   height        chart height in px                            (default 260)
 *   donut         draw a ring and show the total in the hole    (default false)
 *   colors        colours in slice order; follows the theme by default. An
 *                 item's own `color` field wins over this list.
 *   formatLabel   (label) => string, for the legend and the tooltip
 *   formatValue   (value) => string, for the tooltip and the donut total
 *   totalLabel    caption under the donut total                 (default "Total")
 *   emptyMessage  shown when there is nothing to draw
 *   className     extra classes for the wrapper
 *
 * Example: payment modes (amounts in paise, from the subscription report)
 *
 *   <PieChart
 *     donut
 *     data={[
 *       { label: "Cash", value: totals.total_cash },
 *       { label: "Card", value: totals.total_card },
 *       { label: "UPI", value: totals.total_upi },
 *       { label: "Other", value: totals.total_other },
 *     ]}
 *     formatValue={formatMoney}
 *   />
 */
function PieChart({
  data = NO_DATA,
  labelKey = "label",
  valueKey = "value",
  height = DEFAULT_HEIGHT,
  donut = false,
  colors,
  formatLabel = String,
  formatValue = defaultFormatValue,
  totalLabel = "Total",
  emptyMessage = "No data for the selected dates.",
  className,
}) {
  const [containerRef, width] = useElementWidth();

  // Index of the hovered slice, or null.
  const [activeIndex, setActiveIndex] = useState(null);

  const { slices, total } = useMemo(() => {
    const items = data
      .map((item, index) => ({
        label: item?.[labelKey],
        value: Number(item?.[valueKey]) || 0,
        color: item?.color ?? colors?.[index] ?? getSeriesColor(index),
      }))
      .filter((item) => item.value > 0);

    const sum = items.reduce((acc, item) => acc + item.value, 0);

    let used = 0;

    const sized = items.map((item) => {
      const startAngle = (used / sum) * FULL_TURN;

      used += item.value;

      return {
        ...item,
        percent: (item.value / sum) * 100,
        startAngle,
        endAngle: (used / sum) * FULL_TURN,
      };
    });

    return { slices: sized, total: sum };
  }, [data, labelKey, valueKey, colors]);

  const hasData = slices.length > 0;

  // The pie is a square: as wide as the chart allows, as tall as the space
  // under the legend.
  const size = Math.max(Math.min(width, height - LEGEND_HEIGHT), 0);
  const center = size / 2;
  const outerRadius = Math.max(center - PADDING, 0);
  const innerRadius = donut ? outerRadius * DONUT_HOLE : 0;

  const active = activeIndex !== null ? slices[activeIndex] : null;

  // Tooltip sits on the middle of the hovered slice.
  const tooltipSpot = (() => {
    if (!active) return null;

    const middleAngle = (active.startAngle + active.endAngle) / 2;
    const radius = donut
      ? (outerRadius + innerRadius) / 2
      : outerRadius * 0.65;
    const [x, y] = toPoint(center, center, radius, middleAngle);

    return { x, y };
  })();

  const legendItems = slices.map((slice, index) => ({
    key: `${slice.label}-${index}`,
    name: `${formatLabel(slice.label)} (${formatPercent(slice.percent)})`,
    color: slice.color,
  }));

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full flex-col", className)}
      style={{ height }}
    >
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        width > 0 && (
          <>
            <ChartLegend items={legendItems} />

            <div
              className="relative mx-auto shrink-0"
              style={{ width: size, height: size }}
            >
              <svg
                width={size}
                height={size}
                role="img"
                aria-label={donut ? "Donut chart" : "Pie chart"}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {slices.map((slice, index) => {
                  const isActive = activeIndex === index;

                  // The hovered slice moves slightly away from the centre.
                  const middleAngle = (slice.startAngle + slice.endAngle) / 2;
                  const [popX, popY] = toPoint(0, 0, HOVER_POP, middleAngle);

                  return (
                    <path
                      key={`${slice.label}-${index}`}
                      d={getSlicePath(
                        center,
                        center,
                        outerRadius,
                        innerRadius,
                        slice.startAngle,
                        slice.endAngle,
                      )}
                      fill={slice.color}
                      fillOpacity={
                        activeIndex === null || isActive ? 0.9 : 0.55
                      }
                      stroke="var(--background)"
                      strokeWidth={2}
                      transform={
                        isActive ? `translate(${popX} ${popY})` : undefined
                      }
                      onMouseEnter={() => setActiveIndex(index)}
                    />
                  );
                })}
              </svg>

              {donut && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-semibold tabular-nums">
                    {formatValue(total)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {totalLabel}
                  </span>
                </div>
              )}

              {active && tooltipSpot && (
                <ChartTooltipBox
                  x={tooltipSpot.x}
                  y={tooltipSpot.y}
                  width={size}
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: active.color }}
                    />
                    {formatLabel(active.label)}
                  </div>
                  <div className="font-medium">
                    {formatValue(active.value)} ({formatPercent(active.percent)})
                  </div>
                </ChartTooltipBox>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default PieChart;
