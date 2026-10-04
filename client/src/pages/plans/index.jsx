import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import { usePlanStore } from "@/store/plan";

import EditPlanDialog from "./EditPlanDialog";
import PlansList from "./PlansList";

function Plans() {
  const [createOpen, setCreateOpen] = useState(false);

  const createPlan = usePlanStore((state) => state.createPlan);
  const isSaving = usePlanStore((state) => state.isSaving);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Title
          title="Plans"
          description="Manage the membership plans members can subscribe to."
        />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add plan
        </Button>
      </div>

      <Card>
        <CardContent>
          <PlansList />
        </CardContent>
      </Card>

      <EditPlanDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        plan={null}
        isLoading={isSaving}
        onSubmit={(values) => createPlan(values)}
      />
    </div>
  );
}

export default Plans;
