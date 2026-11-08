import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import DueReceiptReportList from "./due_receipt/DueReceiptReportList";

function DueReceiptReport() {
  return (
    <div className="space-y-4">
      <Title
        title="Due receipt report"
        description="Payments received against bills that had a balance due."
      />

      <Card>
        <CardContent>
          <DueReceiptReportList />
        </CardContent>
      </Card>
    </div>
  );
}

export default DueReceiptReport;
