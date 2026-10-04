import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function Reports() {
  return (
    <div className="space-y-6">
      <Title
        title="Reports"
        description="View membership, revenue and attendance reports."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Reports
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

export default Reports;
