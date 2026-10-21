import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Title from "@/components/additonal/Title";

import AttendanceReportList from "./attendance/AttendanceReportList";
import StaffAttendanceReportList from "./attendance/StaffAttendanceReportList";

function AttendanceReport() {
  return (
    <div className="space-y-4">
      <Title
        title="Attendance report"
        description="Member and staff check-ins in a date range, with check-out and duration."
      />

      <Tabs defaultValue="member">
        <TabsList>
          <TabsTrigger value="member">Member</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent>
            <TabsContent value="member">
              <AttendanceReportList />
            </TabsContent>

            <TabsContent value="staff">
              <StaffAttendanceReportList />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

export default AttendanceReport;
