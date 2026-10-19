import { useState } from "react";
import { LayoutDashboard } from "lucide-react";

import DateRangeFilter, {
  getDateRangeValue,
  DATE_RANGE_PRESETS,
} from "@/components/additonal/DateRangeFilter";
import Title from "@/components/additonal/Title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Dashboard() {
  // { preset, startDate, endDate } - use startDate / endDate for the API.
  const [range, setRange] = useState(() =>
    getDateRangeValue(DATE_RANGE_PRESETS.LAST_7_DAYS),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Title
          title="Dashboard"
          description="Overview of memberships, revenue and attendance for the selected period."
        />

        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="size-5" />
            Overview
          </CardTitle>

          <CardDescription>
            Showing {range.startDate || "-"} to {range.endDate || "-"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is under construction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
