import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import { useDiscountStore } from "@/store/discount";

import DiscountList from "./DiscountList";
import EditDiscountDialog from "./EditDiscountDialog";

function Discount() {
  const [createOpen, setCreateOpen] = useState(false);

  const createDiscount = useDiscountStore((state) => state.createDiscount);
  const isSaving = useDiscountStore((state) => state.isSaving);

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
          <DiscountList />
        </CardContent>
      </Card>

      <EditDiscountDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        discount={null}
        isLoading={isSaving}
        onSubmit={(values) => createDiscount(values)}
      />
    </div>
  );
}

export default Discount;
