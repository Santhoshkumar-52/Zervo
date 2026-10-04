import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import MembersList from "./MembersList";

function Members() {
  return (
    <div className="space-y-4">
      <Title
        title="Members"
        description="Manage gym members, their branches and assigned trainers."
      />

      <Card>
        <CardContent>
          <MembersList />
        </CardContent>
      </Card>
    </div>
  );
}

export default Members;
