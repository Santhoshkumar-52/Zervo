import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
} from "lucide-react";

import { getDashboard } from "@/api/dashboard/dashboardApi";
import { AreaChart } from "@/components/additonal/AreaChart";
import { BarChart } from "@/components/additonal/BarChart";
import BranchFilter from "@/components/additonal/BranchFilter";
import DateRangeFilter, {
  getDateRangeValue,
  DATE_RANGE_PRESETS,
} from "@/components/additonal/DateRangeFilter";
import { PieChart } from "@/components/additonal/PieChart";
import Title from "@/components/additonal/Title";
import { useAuthStore } from "@/store/auth";
import { formatMoney, formatMoneyCompact } from "@/utils/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// One entry per chart. `span` holds the full Tailwind classes per breakpoint
// (kept as complete strings so Tailwind can detect them).
//   mobile  : 1 column, everything stacked
//   md      : 2 columns
//   xl      : 3 columns -> memberships 2fr, revenue 1fr, attendance full row
const CHARTS = [
  {
    key: "memberships",
    span: "md:col-span-2 xl:col-span-2",
    title: "Memberships",
    description: "New and renewed memberships",
    icon: PieChartIcon,
  },
  {
    key: "revenue",
    span: "md:col-span-2 xl:col-span-1",
    title: "Revenue",
    description: "Collections over the period",
    icon: LineChart,
  },
  {
    key: "paymentmode",
    span: "md:col-span-2 xl:col-span-1",
    title: "Payment Modes",
    description: "Analyze of payment mode",
    icon: PieChartIcon,
  },
  {
    key: "attendance",
    span: "md:col-span-2 xl:col-span-2",
    title: "Attendance",
    description: "Check-ins over the period",
    icon: BarChart3,
  },
];

function ChartMessage({ children }) {
  return (
    <div className="flex min-h-[260px] w-full flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// Chart styles a TrendChart can use.
const TREND_CHARTS = {
  area: AreaChart,
  bar: BarChart,
};

// Chart for one dashboard trend: { group_by, points: [{ label, value, breakdown? }], series? }.
// When the trend has `series` (e.g. revenue split by plan) the bars are stacked per series.
// The server already grouped the points (day / week / month / year) and wrote
// the x axis labels, so they are shown exactly as they come.
//   type        "area" (default) or "bar"
//   chartProps  passed on to the chart (formatValue, color, height ...)
// Use it for every chart that gets its data from the dashboard API.
function TrendChart({
  type = "area",
  trend,
  isLoading,
  isError,
  valueLabel,
  ...chartProps
}) {
  if (isLoading) return <ChartMessage>Loading...</ChartMessage>;

  if (isError) return <ChartMessage>Could not load the data.</ChartMessage>;

  const Chart = TREND_CHARTS[type];

  return (
    <Chart
      data={trend?.points ?? []}
      labelKey="label"
      formatLabel={String}
      series={trend?.series}
      valueLabel={valueLabel}
      {...chartProps}
    />
  );
}

// Donut chart of the payment modes: [{ id, name, count, amount }] from the
// dashboard API. Each slice is the money received with that mode (paise); the
// legend and tooltip also show how many bills the mode paid.
function PaymentModeChart({ modes, isLoading, isError }) {
  if (isLoading) return <ChartMessage>Loading...</ChartMessage>;

  if (isError) return <ChartMessage>Could not load the data.</ChartMessage>;

  const data = (modes ?? []).map((mode) => ({
    label: `${mode.name} · ${mode.count} ${mode.count === 1 ? "bill" : "bills"}`,
    value: mode.amount,
  }));

  return (
    <PieChart
      donut
      data={data}
      formatValue={formatMoney}
      totalLabel="Received"
      emptyMessage="No payments for the selected dates."
    />
  );
}

function ChartCard({ title, description, icon: Icon, range, children }) {
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-5" />
          {title}
        </CardTitle>

        <CardDescription>
          {description} · {range.startDate || "-"} to {range.endDate || "-"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1">
        {/* Chart fills the remaining card height */}
        {children ?? (
          <div className="flex min-h-[260px] w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Chart coming soon
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  // { preset, startDate, endDate } - use startDate / endDate for the API.
  const [range, setRange] = useState(() =>
    getDateRangeValue(DATE_RANGE_PRESETS.LAST_7_DAYS),
  );

  // Branch shown on the dashboard. Starts as the user's own branch; only
  // group 1 sees the dropdown and can change it, so everyone else stays on
  // their own branch. Use `branchId` for the API.
  const userBranchId = useAuthStore((state) => state.user?.branchId);
  const [branchId, setBranchId] = useState(userBranchId ?? null);

  // GET /api/dashboard - refetches whenever the date range changes.
  // Resolves with { subscriptions, revenue, payment_modes }.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", range.startDate, range.endDate],
    queryFn: () =>
      getDashboard({ start_date: range.startDate, end_date: range.endDate }),
    enabled: Boolean(range.startDate && range.endDate),
  });

  // Content per chart key. Charts without an entry keep the placeholder.
  // To wire another chart: <TrendChart trend={data?.revenue} ... />
  const chartContent = {
    memberships: (
      <TrendChart
        trend={data?.subscriptions}
        isLoading={isLoading}
        isError={isError}
        valueLabel="Subscriptions"
      />
    ),
    revenue: (
      <TrendChart
        type="bar"
        trend={data?.revenue}
        isLoading={isLoading}
        isError={isError}
        valueLabel="Revenue"
        formatValue={formatMoney}
        formatAxisValue={formatMoneyCompact}
      />
    ),
    paymentmode: (
      <PaymentModeChart
        modes={data?.payment_modes}
        isLoading={isLoading}
        isError={isError}
      />
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Title
          title="Dashboard"
          description="Overview of memberships, revenue and attendance for the selected period."
        />

        <div className="flex flex-wrap items-start gap-3">
          <BranchFilter value={branchId} onChange={setBranchId} />

          <DateRangeFilter value={range} onChange={setRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHARTS.map(({ key, span, ...chart }) => (
          <section key={key} className={`min-w-0 ${span}`}>
            <ChartCard range={range} {...chart}>
              {chartContent[key]}
            </ChartCard>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
