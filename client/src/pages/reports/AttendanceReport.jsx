import { CalendarCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function AttendanceReport() {
  return (
    <div className="space-y-6">
      <Title
        title="Attendance report"
        description="Daily check-ins and attendance trends for your members."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5" />
            Attendance report
          </CardTitle>

          <CardDescription>Nothing here yet.</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            This report is under construction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceReport;