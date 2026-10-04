import { UserCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function Attendance() {
  return (
    <div className="space-y-6">
      <Title
        title="Attendance"
        description="Record and review member check-ins."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="size-5" />
            Attendance
          </CardTitle>

          <CardDescription>Nothing here yet.</CardDescription>
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

export default Attendance;
