import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import BalanceReportList from "./balance/BalanceReportList";

function BalanceReport() {
  return (
    <div className="space-y-4">
      <Title
        title="Balance report"
        description="Bills with an amount still due from members, oldest first."
      />

      <Card>
        <CardContent>
          <BalanceReportList />
        </CardContent>
      </Card>
    </div>
  );
}

export default BalanceReport;
