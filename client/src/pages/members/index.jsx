import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import { useMemberStore } from "@/store/member";

import EditMemberDialog from "./EditMemberDialog";
import MembersList from "./MembersList";

function Members() {
  const [createOpen, setCreateOpen] = useState(false);

  const isSaving = useMemberStore((state) => state.isSaving);
  const createMember = useMemberStore((state) => state.createMember);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Title
          title="Members"
          description="Manage gym members, their branches and assigned trainers."
        />

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Add member
        </Button>
      </div>

      <Card>
        <CardContent>
          <MembersList />
        </CardContent>
      </Card>

      {/* Add. The dialog closes only when createMember resolves. */}
      <EditMemberDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        member={null}
        isLoading={isSaving}
        onSubmit={(values) => createMember(values)}
      />
    </div>
  );
}

export default Members;
