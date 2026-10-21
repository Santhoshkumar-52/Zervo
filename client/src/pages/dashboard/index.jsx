import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, LineChart, PieChart } from "lucide-react";

import { getDashboard } from "@/api/dashboard/dashboardApi";
import { AreaChart } from "@/components/additonal/AreaChart";
import BranchFilter from "@/components/additonal/BranchFilter";
import DateRangeFilter, {
  getDateRangeValue,
  DATE_RANGE_PRESETS,
} from "@/components/additonal/DateRangeFilter";
import Title from "@/components/additonal/Title";
import { useAuthStore } from "@/store/auth";
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
    icon: PieChart,
  },
  {
    key: "revenue",
    span: "md:col-span-1 xl:col-span-1",
    title: "Revenue",
    description: "Collections over the period",
    icon: LineChart,
  },
  {
    key: "attendance",
    span: "md:col-span-1 xl:col-span-3",
    title: "Attendance",
    description: "Check-ins over the period",
    icon: BarChart3,
  },
];

function ChartMessage({ children }) {
  return (
    <div className="flex min-h-64 w-full flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// Area chart for one dashboard trend: { group_by, points: [{ label, value }] }.
// The server already grouped the points (day / week / month / year) and wrote
// the x axis labels, so they are shown exactly as they come.
// Use it for every chart that gets its data from the dashboard API.
function TrendChart({ trend, isLoading, isError, valueLabel }) {
  if (isLoading) return <ChartMessage>Loading...</ChartMessage>;

  if (isError) return <ChartMessage>Could not load the data.</ChartMessage>;

  return (
    <AreaChart
      data={trend?.points ?? []}
      labelKey="label"
      formatLabel={String}
      valueLabel={valueLabel}
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
          <div className="flex min-h-64 w-full flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
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
  // Resolves with { subscriptions: { group_by, points } }.
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
