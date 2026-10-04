import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import DiscountList from "./DiscountList";
import EditDiscountDialog from "./EditDiscountDialog";

// UI-only sample data. Replace with the store / API once it exists.
const INITIAL_DISCOUNTS = [
  {
    id: 1,
    name: "New year offer",
    type: "percentage",
    value: 20,
    valid_from: "2026-01-01",
    valid_to: "2026-01-31",
    is_active: false,
  },
  {
    id: 2,
    name: "Student discount",
    type: "percentage",
    value: 10,
    valid_from: "2026-06-01",
    valid_to: "2026-12-31",
    is_active: true,
  },
  {
    id: 3,
    name: "Referral bonus",
    type: "fixed",
    value: 500,
    valid_from: "2026-09-01",
    valid_to: "2026-11-30",
    is_active: true,
  },
];

const getNextId = (items) => Math.max(0, ...items.map((item) => item.id)) + 1;

function Discount() {
  const [createOpen, setCreateOpen] = useState(false);
  const [discounts, setDiscounts] = useState(INITIAL_DISCOUNTS);

  const handleCreate = (values) =>
    setDiscounts((prev) => [{ id: getNextId(prev), ...values }, ...prev]);

  const handleUpdate = (id, values) =>
    setDiscounts((prev) =>
      prev.map((discount) =>
        discount.id === id ? { ...discount, ...values } : discount,
      ),
    );

  const handleDelete = (discount) =>
    setDiscounts((prev) => prev.filter((item) => item.id !== discount.id));

  const handleToggleStatus = (discount, isActive) =>
    handleUpdate(discount.id, { is_active: isActive });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Title
          title="Discount"
          description="Manage discount offers that can be applied to subscriptions."
        />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add discount
        </Button>
      </div>

      <Card>
        <CardContent>
          <DiscountList
            discounts={discounts}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        </CardContent>
      </Card>

      <EditDiscountDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        discount={null}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default Discount;
