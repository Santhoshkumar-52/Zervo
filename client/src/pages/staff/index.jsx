import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import StaffList from "./StaffList";

function Staff() {
  return (
    <div className="space-y-4">
      <Title
        title="Staff"
        description="Manage gym staff, trainers and their branches."
      />

      <Card>
        <CardContent>
          <StaffList />
        </CardContent>
      </Card>
    </div>
  );
}

export default Staff;
