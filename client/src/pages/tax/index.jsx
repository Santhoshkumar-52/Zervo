import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import { useTaxStore } from "@/store/tax";

import EditTaxDialog from "./EditTaxDialog";
import TaxList from "./TaxList";

function Tax() {
  const [createOpen, setCreateOpen] = useState(false);

  const createTax = useTaxStore((state) => state.createTax);
  const isSaving = useTaxStore((state) => state.isSaving);

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
          <TaxList />
        </CardContent>
      </Card>

      <EditTaxDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        tax={null}
        isLoading={isSaving}
        onSubmit={(values) => createTax(values)}
      />
    </div>
  );
}

export default Tax;
