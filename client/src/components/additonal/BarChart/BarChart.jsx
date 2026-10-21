import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Y_TICKS,
  defaultFormatLabel,
  defaultFormatValue,
  getNiceMax,
  useElementWidth,
} from "@/components/additonal/ChartKit";

// Layout (px). Rows run top to bottom, values run left to right.
const LABEL_WIDTH = 96; // room for the row labels on the left
const RIGHT_PAD = 24; // room for the last value label
const TOP_PAD = 4;
const ROW_HEIGHT = 36;
const BAR_HEIGHT = 20;
const AXIS_HEIGHT = 24; // value axis under the rows, it does not scroll
const CORNER_RADIUS = 4;

// A tooltip needs about this much room above its bar, else it opens below.
const TOOLTIP_ROOM = 72;

// Segment colours follow the active theme. More series than colours reuse them.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const NO_SERIES = [];

// Bar with only the right end rounded, so it sits flat on the left baseline.
// Segments inside a stack are not rounded (`rounded` false).
const getBarPath = (x, y, width, height, rounded) => {
  const radius = rounded ? Math.min(CORNER_RADIUS, height / 2, width) : 0;

  return [
    `M ${x} ${y}`,
    `H ${x + width - radius}`,
    `Q ${x + width} ${y} ${x + width} ${y + radius}`,
    `V ${y + height - radius}`,
    `Q ${x + width} ${y + height} ${x + width - radius} ${y + height}`,
    `H ${x}`,
    "Z",
  ].join(" ");
};

// The coloured parts of one row, left to right. Without series the row is one
// part. With series each part is one series; parts without value are dropped.
const getSegments = (item, series, color) => {
  if (series.length === 0) {
    return [{ key: "value", name: null, value: item.value, color }];
  }

  return series
    .map((entry, index) => ({
      key: entry.key,
      name: entry.name,
      value: Number(item.breakdown?.[entry.key]) || 0,
      color: entry.color ?? CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((segment) => segment.value > 0);
};

/**
 * Horizontal bar chart drawn with SVG (no chart library needed). Every data
 * item is one row, oldest first from the top. The chart is at most `height`
 * tall; when there are more rows than fit, the rows scroll vertically while the
 * value axis stays in place.
 *
 * Props
 *   data            [{ [labelKey]: "05 Oct", [valueKey]: 4 }, ...]  (row order)
 *   labelKey        field used for the row labels              (default "date")
 *   valueKey        field used for the bar length              (default "value")
 *   series          [{ key, name, color? }] splits every bar into coloured
 *                   parts, in this order from the left. The amount of each part
 *                   is read from item[segmentsKey][key]. Without series every
 *                   bar is one colour.
 *   segmentsKey     field holding the amount per series key    (default "breakdown")
 *   height          tallest the chart gets, in px               (default 300)
 *   color           bar colour when there are no series; follows the theme
 *   formatLabel     (label) => string, for the row labels and the tooltip
 *   formatValue     (value) => string, for the tooltip
 *   formatAxisValue (value) => string, for the value axis (default formatValue)
 *   valueLabel      name shown in the tooltip without series   (default "Value")
 *   emptyMessage    shown when data is empty
 *   className       extra classes for the wrapper
 */
function BarChart({
  data = [],
  labelKey = "date",
  valueKey = "value",
  series = NO_SERIES,
  segmentsKey = "breakdown",
  height = 300,
  color = "var(--primary)",
  formatLabel = defaultFormatLabel,
  formatValue = defaultFormatValue,
  formatAxisValue = formatValue,
  valueLabel = "Value",
  emptyMessage = "No data for the selected dates.",
  className,
}) {
  const scrollRef = useRef(null);
  const [containerRef, width] = useElementWidth();

  // { row, segment, below }: segment is null while only the row is hovered;
  // below puts the tooltip under the bar when there is no room above it.
  const [hover, setHover] = useState(null);

  const innerWidth = Math.max(width - LABEL_WIDTH - RIGHT_PAD, 0);

  const { rows, xMax } = useMemo(() => {
    const items = data.map((item) => {
      const plain = {
        label: item?.[labelKey],
        value: Number(item?.[valueKey]) || 0,
        breakdown: item?.[segmentsKey],
      };
      const segments = getSegments(plain, series, color);

      return {
        label: plain.label,
        segments,
        total: segments.reduce((sum, segment) => sum + segment.value, 0),
      };
    });

    const niceMax = getNiceMax(Math.max(0, ...items.map((item) => item.total)));

    const plotted = items.map((item, index) => {
      const top = TOP_PAD + index * ROW_HEIGHT;
      const barY = top + (ROW_HEIGHT - BAR_HEIGHT) / 2;

      let used = 0;

      const segments = item.segments.map((segment) => {
        const x = LABEL_WIDTH + (used / niceMax) * innerWidth;

        used += segment.value;

        return {
          ...segment,
          x,
          width: (segment.value / niceMax) * innerWidth,
        };
      });

      return { ...item, segments, top, barY, centerY: top + ROW_HEIGHT / 2 };
    });

    return { rows: plotted, xMax: niceMax };
  }, [data, labelKey, valueKey, segmentsKey, series, color, innerWidth]);

  const hasData = rows.length > 0;
  const plotHeight = TOP_PAD * 2 + rows.length * ROW_HEIGHT;

  const handleMouseMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(
      (event.clientY - bounds.top - TOP_PAD) / ROW_HEIGHT,
    );

    setHover((current) => {
      if (index < 0 || index >= rows.length) return null;

      return current?.row === index
        ? current
        : { row: index, segment: null, below: false };
    });
  };

  const enterSegment = (row, segment) => {
    const scrolled = scrollRef.current?.scrollTop ?? 0;

    setHover({
      row,
      segment,
      below: rows[row].barY - scrolled < TOOLTIP_ROOM,
    });
  };

  const leaveSegment = () =>
    setHover((current) => (current ? { ...current, segment: null } : null));

  const activeRow = hover ? rows[hover.row] : null;
  const activeSegment =
    activeRow && hover.segment !== null ? activeRow.segments[hover.segment] : null;

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full flex-col", className)}
      style={hasData ? { maxHeight: height } : { height }}
    >
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        width > 0 && (
          <>
            {series.length > 0 && (
              <ul className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 pb-2 text-xs text-muted-foreground">
                {series.map((entry, index) => (
                  <li key={entry.key} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{
                        background:
                          entry.color ?? CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    {entry.name}
                  </li>
                ))}
              </ul>
            )}

            {/* Rows: scrolls up and down when there are more than fit */}
            <div
              ref={scrollRef}
              className="min-h-0 overflow-x-hidden overflow-y-auto"
            >
              <div className="relative" style={{ height: plotHeight }}>
                <svg
                  width={width}
                  height={plotHeight}
                  role="img"
                  aria-label="Horizontal bar chart"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Vertical grid lines */}
                  {Array.from({ length: Y_TICKS + 1 }, (_, index) => {
                    const x = LABEL_WIDTH + (index / Y_TICKS) * innerWidth;

                    return (
                      <line
                        key={index}
                        x1={x}
                        x2={x}
                        y1={0}
                        y2={plotHeight}
                        stroke="var(--border)"
                        strokeDasharray={index === 0 ? undefined : "3 3"}
                      />
                    );
                  })}

                  {/* Soft highlight behind the hovered row */}
                  {activeRow && (
                    <rect
                      x={0}
                      y={activeRow.top}
                      width={width}
                      height={ROW_HEIGHT}
                      fill="var(--muted)"
                      opacity={0.5}
                    />
                  )}

                  {rows.map((row, rowIndex) => (
                    <g key={`${row.label}-${rowIndex}`}>
                      <text
                        x={LABEL_WIDTH - 8}
                        y={row.centerY}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="fill-muted-foreground text-[11px]"
                      >
                        {formatLabel(row.label)}
                      </text>

                      {row.segments.map((segment, segmentIndex) => (
                        <path
                          key={segment.key}
                          d={getBarPath(
                            segment.x,
                            row.barY,
                            segment.width,
                            BAR_HEIGHT,
                            segmentIndex === row.segments.length - 1,
                          )}
                          fill={segment.color}
                          fillOpacity={
                            hover?.row === rowIndex && hover.segment === segmentIndex
                              ? 1
                              : 0.85
                          }
                          onMouseEnter={() => enterSegment(rowIndex, segmentIndex)}
                          onMouseLeave={leaveSegment}
                        />
                      ))}
                    </g>
                  ))}
                </svg>

                {activeSegment && (
                  <div
                    className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
                    style={{
                      left: Math.min(
                        Math.max(activeSegment.x + activeSegment.width / 2, 72),
                        width - 72,
                      ),
                      top: hover.below
                        ? activeRow.barY + BAR_HEIGHT + 6
                        : activeRow.barY - 6,
                      transform: hover.below
                        ? "translate(-50%, 0)"
                        : "translate(-50%, -100%)",
                    }}
                  >
                    <div className="text-muted-foreground">
                      {formatLabel(activeRow.label)}
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      {series.length > 0 && (
                        <span
                          className="size-2 rounded-full"
                          style={{ background: activeSegment.color }}
                        />
                      )}
                      {activeSegment.name ?? valueLabel}:{" "}
                      {formatValue(activeSegment.value)}
                    </div>
                    {activeRow.segments.length > 1 && (
                      <div className="text-muted-foreground">
                        Total: {formatValue(activeRow.total)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Value axis: stays visible while the rows scroll */}
            <svg width={width} height={AXIS_HEIGHT} className="shrink-0">
              {Array.from({ length: Y_TICKS + 1 }, (_, index) => (
                <text
                  key={index}
                  x={LABEL_WIDTH + (index / Y_TICKS) * innerWidth}
                  y={AXIS_HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatAxisValue((xMax / Y_TICKS) * index)}
                </text>
              ))}
            </svg>
          </>
        )
      )}
    </div>
  );
}

export default BarChart;
