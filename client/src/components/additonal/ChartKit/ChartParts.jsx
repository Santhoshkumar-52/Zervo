import { MARGIN, Y_TICKS, getLabelEvery } from "./chartUtils";

// Pieces every chart is made of. Charts only draw their own shapes (area, bars)
// and use these for the rest, so they all look and behave the same.

// Horizontal grid lines with the y axis values.
export function ChartGrid({ yMax, baseY, innerWidth, innerHeight, formatValue }) {
  return (
    <g>
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
    </g>
  );
}

// x axis labels, only as many as fit. Each point needs { x, label }.
export function ChartXLabels({ points, innerWidth, y, formatLabel }) {
  const every = getLabelEvery(points.length, innerWidth);

  return (
    <g>
      {points.map((point, index) =>
        index % every === 0 ? (
          <text
            key={`${point.label}-${index}`}
            x={point.x}
            y={y}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {formatLabel(point.label)}
          </text>
        ) : null,
      )}
    </g>
  );
}

// Look of every tooltip.
const TOOLTIP_CLASS =
  "pointer-events-none absolute z-10 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md";

// Hover card above the active point: { x, y, label, value }. It stays inside
// the chart width.
export function ChartTooltip({
  point,
  width,
  valueLabel,
  formatLabel,
  formatValue,
}) {
  return (
    <div
      className={TOOLTIP_CLASS}
      style={{
        left: Math.min(Math.max(point.x, 56), width - 56),
        top: Math.max(point.y - 12, 0),
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="text-muted-foreground">{formatLabel(point.label)}</div>
      <div className="font-medium">
        {valueLabel}: {formatValue(point.value)}
      </div>
    </div>
  );
}

// Hover card with any content, placed next to a spot of the chart (x, y in px
// from the chart's top left). It sits above the spot, or below it when there
// is no room above, and stays inside the chart width.
export function ChartTooltipBox({ x, y, width, children }) {
  const below = y < 72;

  return (
    <div
      className={TOOLTIP_CLASS}
      style={{
        left: Math.min(Math.max(x, 72), Math.max(width - 72, 72)),
        top: below ? y + 16 : y - 12,
        transform: below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      }}
    >
      {children}
    </div>
  );
}

// Colour key for a split chart: items are { key, name, color }.
export function ChartLegend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.name}
        </span>
      ))}
    </div>
  );
}
