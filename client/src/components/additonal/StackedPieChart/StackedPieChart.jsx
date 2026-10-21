import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ChartLegend,
  ChartTooltipBox,
  FULL_TURN,
  defaultFormatValue,
  getSeriesColor,
  getSlicePath,
  toPoint,
  useElementWidth,
} from "@/components/additonal/ChartKit";

// Layout (px).
const DEFAULT_HEIGHT = 320;
const LEGEND_HEIGHT = 80; // two legend rows, each with a small caption
const PADDING = 8; // room around the chart for the hover pop-out
const HOVER_POP = 4; // how far the hovered slice moves outwards

// Ring sizes as a share of the radius: centre hole, inner ring, a small gap,
// outer ring.
const HOLE = 0.36;
const INNER_RING_END = 0.66;
const OUTER_RING_START = 0.69;

const NO_DATA = [];

// 42.5 -> "42.5%", 50 -> "50%"
const formatPercent = (percent) => `${Math.round(percent * 10) / 10}%`;

/**
 * Stacked (two ring) pie chart drawn with SVG (no chart library needed).
 * The inner ring has one slice per parent item. The outer ring splits every
 * parent slice into its children, so each outer slice sits right outside the
 * parent it belongs to. Both rings start at the top and go clockwise. Items
 * without a positive value are left out. The middle shows the total.
 *
 * A child keeps the same colour under every parent (matched by `key`), so the
 * outer ring can be read with the legend.
 *
 * Props
 *   data          [{ label, value?, color?, children: [{ key?, label, value, color? }] }]
 *                 A parent without `value` takes the sum of its children.
 *   height        chart height in px                            (default 320)
 *   colors        colours of the parents in order; follows the theme by
 *                 default. An item's own `color` field wins over this list.
 *   formatValue   (value) => string, for the tooltip and the total
 *   totalLabel    caption under the total                       (default "Total")
 *   innerLabel    legend caption of the inner ring              (default "Inner ring")
 *   outerLabel    legend caption of the outer ring              (default "Outer ring")
 *   emptyMessage  shown when there is nothing to draw
 *   className     extra classes for the wrapper
 *
 * Example: attendance, gender inside and group outside
 *
 *   <StackedPieChart
 *     data={[
 *       { label: "Male", children: [
 *         { key: "member", label: "Members", value: 19 },
 *         { key: "trainer", label: "Trainer", value: 34 },
 *       ] },
 *       { label: "Female", children: [
 *         { key: "member", label: "Members", value: 15 },
 *         { key: "trainer", label: "Trainer", value: 27 },
 *       ] },
 *     ]}
 *     innerLabel="Gender"
 *     outerLabel="Group"
 *   />
 */
function StackedPieChart({
  data = NO_DATA,
  height = DEFAULT_HEIGHT,
  colors,
  formatValue = defaultFormatValue,
  totalLabel = "Total",
  innerLabel = "Inner ring",
  outerLabel = "Outer ring",
  emptyMessage = "No data for the selected dates.",
  className,
}) {
  const [containerRef, width] = useElementWidth();

  // The hovered slice: { ring: "inner" | "outer", index }, or null.
  const [active, setActive] = useState(null);

  const { inner, outer, total, groupLegend } = useMemo(() => {
    // One colour per child, by first appearance (zero values included), so a
    // child keeps its colour whichever range is picked.
    const childColor = new Map();

    data.forEach((parent) =>
      (parent.children ?? []).forEach((child) => {
        const key = child.key ?? child.label;

        if (!childColor.has(key)) {
          childColor.set(
            key,
            child.color ?? getSeriesColor(data.length + childColor.size),
          );
        }
      }),
    );

    const parents = data
      .map((parent, index) => {
        const kids = (parent.children ?? []).map((child) => {
          const key = child.key ?? child.label;

          return {
            key,
            label: child.label,
            value: Number(child.value) || 0,
            color: childColor.get(key),
          };
        });

        const value =
          parent.value != null
            ? Number(parent.value) || 0
            : kids.reduce((sum, kid) => sum + kid.value, 0);

        return {
          label: parent.label,
          value,
          color: parent.color ?? colors?.[index] ?? getSeriesColor(index),
          kids,
        };
      })
      .filter((parent) => parent.value > 0);

    const sum = parents.reduce((acc, parent) => acc + parent.value, 0);

    let used = 0;

    const innerSlices = parents.map((parent) => {
      const startAngle = (used / sum) * FULL_TURN;

      used += parent.value;

      return {
        ...parent,
        percent: (parent.value / sum) * 100,
        startAngle,
        endAngle: (used / sum) * FULL_TURN,
      };
    });

    // Every parent slice is shared out between its children.
    const outerSlices = [];
    const groupTotals = new Map();

    innerSlices.forEach((parent) => {
      const span = parent.endAngle - parent.startAngle;
      let kidUsed = 0;

      parent.kids
        .filter((kid) => kid.value > 0)
        .forEach((kid) => {
          const startAngle = parent.startAngle + (kidUsed / parent.value) * span;

          kidUsed += kid.value;

          outerSlices.push({
            ...kid,
            parentLabel: parent.label,
            percent: (kid.value / sum) * 100,
            startAngle,
            endAngle: parent.startAngle + (kidUsed / parent.value) * span,
          });

          const known = groupTotals.get(kid.key);

          groupTotals.set(kid.key, {
            key: kid.key,
            label: kid.label,
            color: kid.color,
            value: (known?.value ?? 0) + kid.value,
          });
        });
    });

    return {
      inner: innerSlices,
      outer: outerSlices,
      total: sum,
      groupLegend: [...groupTotals.values()],
    };
  }, [data, colors]);

  const hasData = inner.length > 0;

  // The chart is a square: as wide as the space allows, as tall as the space
  // under the legends.
  const size = Math.max(Math.min(width, height - LEGEND_HEIGHT), 0);
  const center = size / 2;
  const radius = Math.max(center - PADDING, 0);

  const rings = {
    inner: { from: radius * HOLE, to: radius * INNER_RING_END, slices: inner },
    outer: { from: radius * OUTER_RING_START, to: radius, slices: outer },
  };

  const activeSlice = active ? rings[active.ring].slices[active.index] : null;

  // Tooltip sits on the middle of the hovered slice.
  const tooltipSpot = (() => {
    if (!active || !activeSlice) return null;

    const ring = rings[active.ring];
    const middleAngle = (activeSlice.startAngle + activeSlice.endAngle) / 2;
    const [x, y] = toPoint(
      center,
      center,
      (ring.from + ring.to) / 2,
      middleAngle,
    );

    return { x, y };
  })();

  const innerLegend = inner.map((slice, index) => ({
    key: `inner-${slice.label}-${index}`,
    name: `${slice.label} (${formatPercent(slice.percent)})`,
    color: slice.color,
  }));

  const outerLegend = groupLegend.map((group) => ({
    key: `outer-${group.key}`,
    name: `${group.label} (${formatPercent((group.value / total) * 100)})`,
    color: group.color,
  }));

  const renderRing = (ringName) => {
    const ring = rings[ringName];

    return ring.slices.map((slice, index) => {
      const isActive = active?.ring === ringName && active.index === index;

      // The hovered slice moves slightly away from the centre.
      const middleAngle = (slice.startAngle + slice.endAngle) / 2;
      const [popX, popY] = toPoint(0, 0, HOVER_POP, middleAngle);

      return (
        <path
          key={`${ringName}-${slice.label}-${index}`}
          d={getSlicePath(
            center,
            center,
            ring.to,
            ring.from,
            slice.startAngle,
            slice.endAngle,
          )}
          fill={slice.color}
          fillOpacity={active === null || isActive ? 0.9 : 0.55}
          stroke="var(--background)"
          strokeWidth={2}
          transform={isActive ? `translate(${popX} ${popY})` : undefined}
          onMouseEnter={() => setActive({ ring: ringName, index })}
        />
      );
    });
  };

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
            <div>
              <div className="pb-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {innerLabel} (inside)
              </div>
              <ChartLegend items={innerLegend} />
            </div>

            <div>
              <div className="pb-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {outerLabel} (outside)
              </div>
              <ChartLegend items={outerLegend} />
            </div>

            <div
              className="relative mx-auto shrink-0"
              style={{ width: size, height: size }}
            >
              <svg
                width={size}
                height={size}
                role="img"
                aria-label="Stacked pie chart"
                onMouseLeave={() => setActive(null)}
              >
                {renderRing("inner")}
                {renderRing("outer")}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-semibold tabular-nums">
                  {formatValue(total)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalLabel}
                </span>
              </div>

              {activeSlice && tooltipSpot && (
                <ChartTooltipBox
                  x={tooltipSpot.x}
                  y={tooltipSpot.y}
                  width={size}
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: activeSlice.color }}
                    />
                    {active.ring === "outer"
                      ? `${activeSlice.label} · ${activeSlice.parentLabel}`
                      : activeSlice.label}
                  </div>
                  <div className="font-medium">
                    {formatValue(activeSlice.value)} (
                    {formatPercent(activeSlice.percent)})
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

export default StackedPieChart;
