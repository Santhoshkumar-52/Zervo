import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, PieChart as PieChartIcon } from "lucide-react";

import { getDashboard } from "@/api/dashboard/dashboardApi";
import { AreaChart } from "@/components/additonal/AreaChart";
import { BarChart } from "@/components/additonal/BarChart";
import BranchFilter from "@/components/additonal/BranchFilter";
import DateRangeFilter, {
  getDateRangeValue,
  DATE_RANGE_PRESETS,
} from "@/components/additonal/DateRangeFilter";
import { PieChart } from "@/components/additonal/PieChart";
import { StackedPieChart } from "@/components/additonal/StackedPieChart";
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
import { Skeleton } from "@/components/ui/skeleton";

// One entry per chart. `span` holds the full Tailwind classes per breakpoint
// (kept as complete strings so Tailwind can detect them).
//   mobile  : 1 column, everything stacked
//   md      : 2 columns
//   xl      : 3 columns -> memberships 2fr, revenue 1fr, then payment modes,
//             member attendance and staff attendance share the next row
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
    key: "memberAttendance",
    span: "md:col-span-1 xl:col-span-1",
    title: "Member Attendance",
    description: "Member check-ins by gender",
    icon: PieChartIcon,
  },
  {
    key: "staffAttendance",
    span: "md:col-span-1 xl:col-span-1",
    title: "Staff Attendance",
    description: "Staff check-ins by gender and group",
    icon: PieChartIcon,
  },
];

function ChartMessage({ children }) {
  return (
    <div className="flex min-h-[260px] w-full flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// Wrapper shared by all chart skeletons. Screen readers hear one "Loading ..."
// message instead of a pile of empty blocks.
function ChartSkeleton({ label, minHeight = "min-h-[260px]", children }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={`flex w-full flex-1 ${minHeight}`}
    >
      <span className="sr-only">Loading {label}</span>
      {children}
    </div>
  );
}

// Bar heights for the trend skeleton (complete Tailwind classes, so they are
// detected at build time).
const SKELETON_BAR_HEIGHTS = [
  "h-2/5",
  "h-3/5",
  "h-1/2",
  "h-4/5",
  "h-2/3",
  "h-full",
  "h-3/5",
  "h-1/2",
];

// Skeleton for the area / bar charts: a few pulsing bars on a baseline.
function TrendSkeleton({ label }) {
  return (
    <ChartSkeleton label={label}>
      <div className="flex w-full items-end gap-2 border-b pb-2">
        {SKELETON_BAR_HEIGHTS.map((height, index) => (
          <Skeleton
            key={index}
            className={`${height} flex-1 rounded-b-none`}
          />
        ))}
      </div>
    </ChartSkeleton>
  );
}

// Skeleton for the donut charts: a ring with a few legend lines under it.
// `rings` = 2 draws a second, inner ring (stacked pie chart).
function DonutSkeleton({ label, rings = 1, minHeight }) {
  return (
    <ChartSkeleton label={label} minHeight={minHeight}>
      <div className="flex w-full flex-col items-center justify-center gap-6">
        <div className="relative size-44 sm:size-52">
          <Skeleton className="size-full rounded-full" />

          {rings === 2 && (
            <Skeleton className="absolute inset-8 rounded-full ring-4 ring-card" />
          )}

          {/* Hole of the donut */}
          <div className="absolute inset-1/4 rounded-full bg-card" />
        </div>

        <div className="flex w-full max-w-48 flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    </ChartSkeleton>
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
  if (isLoading) return <TrendSkeleton label={valueLabel ?? "chart"} />;

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
  if (isLoading) return <DonutSkeleton label="payment modes" />;

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

// Donut chart of the member attendance split by gender:
// [{ key, name, count }] from the dashboard API. Each slice is the number of
// member check-ins of that gender; the middle shows the total.
function MemberAttendanceChart({ attendance, isLoading, isError }) {
  if (isLoading) return <DonutSkeleton label="member attendance" />;

  if (isError) return <ChartMessage>Could not load the data.</ChartMessage>;

  const data = (attendance ?? []).map((gender) => ({
    label: gender.name,
    value: gender.count,
  }));

  return (
    <PieChart
      donut
      data={data}
      formatValue={(value) => Number(value).toLocaleString()}
      totalLabel="Check-ins"
      emptyMessage="No member check-ins for the selected dates."
    />
  );
}

// Stacked pie chart of the staff attendance:
// [{ key, name, count, groups: [{ key, name, count }] }] from the dashboard
// API. The inner ring is the gender, the outer ring splits each gender by staff
// group (owner, manager ...); the middle shows the total.
function StaffAttendanceChart({ attendance, isLoading, isError }) {
  if (isLoading)
    return (
      <DonutSkeleton
        label="staff attendance"
        rings={2}
        minHeight="min-h-[380px]"
      />
    );

  if (isError) return <ChartMessage>Could not load the data.</ChartMessage>;

  const data = (attendance ?? []).map((gender) => ({
    label: gender.name,
    children: gender.groups.map((group) => ({
      key: group.key,
      label: group.name,
      value: group.count,
    })),
  }));

  return (
    <StackedPieChart
      height={380}
      data={data}
      formatValue={(value) => Number(value).toLocaleString()}
      totalLabel="Check-ins"
      innerLabel="Gender"
      outerLabel="Group"
      emptyMessage="No staff check-ins for the selected dates."
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
  // Resolves with { subscriptions, revenue, payment_modes, member_attendance,
  // staff_attendance }.
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
    memberAttendance: (
      <MemberAttendanceChart
        attendance={data?.member_attendance}
        isLoading={isLoading}
        isError={isError}
      />
    ),
    staffAttendance: (
      <StaffAttendanceChart
        attendance={data?.staff_attendance}
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
