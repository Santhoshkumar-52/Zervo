import { Dumbbell } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function Subscriptions() {
  return (
    <div className="space-y-6">
      <Title
        title="Subscriptions"
        description="Manage membership plans and member subscriptions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="size-5" />
            Subscriptions
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

export default Subscriptions;
