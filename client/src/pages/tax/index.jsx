import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import EditTaxDialog from "./EditTaxDialog";
import TaxList from "./TaxList";

// UI-only sample data. Replace with the store / API once it exists.
const INITIAL_TAXES = [
  {
    id: 1,
    name: "GST",
    rate: 18,
    description: "Goods and Services Tax on memberships",
    is_active: true,
  },
  {
    id: 2,
    name: "CGST",
    rate: 9,
    description: "Central GST (half of GST)",
    is_active: true,
  },
  {
    id: 3,
    name: "SGST",
    rate: 9,
    description: "State GST (half of GST)",
    is_active: true,
  },
  {
    id: 4,
    name: "Service charge",
    rate: 5,
    description: "",
    is_active: false,
  },
];

const getNextId = (items) => Math.max(0, ...items.map((item) => item.id)) + 1;

function Tax() {
  const [createOpen, setCreateOpen] = useState(false);
  const [taxes, setTaxes] = useState(INITIAL_TAXES);

  const handleCreate = (values) =>
    setTaxes((prev) => [{ id: getNextId(prev), ...values }, ...prev]);

  const handleUpdate = (id, values) =>
    setTaxes((prev) =>
      prev.map((tax) => (tax.id === id ? { ...tax, ...values } : tax)),
    );

  const handleDelete = (tax) =>
    setTaxes((prev) => prev.filter((item) => item.id !== tax.id));

  const handleToggleStatus = (tax, isActive) =>
    handleUpdate(tax.id, { is_active: isActive });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Title
          title="Tax"
          description="Manage the taxes applied to subscriptions and payments."
        />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add tax
        </Button>
      </div>

      <Card>
        <CardContent>
          <TaxList
            taxes={taxes}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        </CardContent>
      </Card>

      <EditTaxDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        tax={null}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default Tax;
