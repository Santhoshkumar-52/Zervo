import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import EditPlanDialog from "./EditPlanDialog";
import PlansList from "./PlansList";

// UI-only sample data. Replace with the store / API once it exists.
const INITIAL_PLANS = [
  {
    id: 1,
    name: "Monthly",
    duration_months: 1,
    price: 1500,
    description: "Gym access for one month",
    is_active: true,
  },
  {
    id: 2,
    name: "Quarterly",
    duration_months: 3,
    price: 4000,
    description: "Gym access for three months",
    is_active: true,
  },
  {
    id: 3,
    name: "Half yearly",
    duration_months: 6,
    price: 7500,
    description: "Gym access for six months",
    is_active: true,
  },
  {
    id: 4,
    name: "Annual",
    duration_months: 12,
    price: 13000,
    description: "",
    is_active: false,
  },
];

const getNextId = (items) => Math.max(0, ...items.map((item) => item.id)) + 1;

function Plans() {
  const [createOpen, setCreateOpen] = useState(false);
  const [plans, setPlans] = useState(INITIAL_PLANS);

  const handleCreate = (values) =>
    setPlans((prev) => [{ id: getNextId(prev), ...values }, ...prev]);

  const handleUpdate = (id, values) =>
    setPlans((prev) =>
      prev.map((plan) => (plan.id === id ? { ...plan, ...values } : plan)),
    );

  const handleDelete = (plan) =>
    setPlans((prev) => prev.filter((item) => item.id !== plan.id));

  const handleToggleStatus = (plan, isActive) =>
    handleUpdate(plan.id, { is_active: isActive });

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
          <PlansList
            plans={plans}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        </CardContent>
      </Card>

      <EditPlanDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        plan={null}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default Plans;
