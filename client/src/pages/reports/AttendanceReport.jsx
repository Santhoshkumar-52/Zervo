import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import AttendanceReportList from "./attendance/AttendanceReportList";

function AttendanceReport() {
  return (
    <div className="space-y-4">
      <Title
        title="Attendance report"
        description="Member check-ins in a date range, with check-out and duration."
      />

      <Card>
        <CardContent>
          <AttendanceReportList />
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendanceReport;
