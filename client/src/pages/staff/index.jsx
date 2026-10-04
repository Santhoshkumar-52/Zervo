import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import { useStaffStore } from "@/store/staff";

import EditStaffDialog from "./EditStaffDialog";
import StaffList from "./StaffList";

function Staff() {
  const [createOpen, setCreateOpen] = useState(false);

  const isSaving = useStaffStore((state) => state.isSaving);
  const createStaff = useStaffStore((state) => state.createStaff);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Title
          title="Staff"
          description="Manage gym staff, trainers and their branches."
        />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add staff
        </Button>
      </div>

      <Card>
        <CardContent>
          <StaffList />
        </CardContent>
      </Card>

      {/* Add. The dialog closes only when createStaff resolves. */}
      <EditStaffDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        staff={null}
        isLoading={isSaving}
        onSubmit={(values) => createStaff(values)}
      />
    </div>
  );
}

export default Staff;
