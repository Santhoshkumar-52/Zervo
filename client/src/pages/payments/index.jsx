import { CreditCard } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function Payments() {
  return (
    <div className="space-y-6">
      <Title
        title="Payments"
        description="Track payments, dues and payment history."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Payments
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

export default Payments;
