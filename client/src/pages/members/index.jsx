import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";
import MemberTabs from "./MemberTabs";

function Members() {
  return (
    <div className="space-y-2">
      <Title
        title="Members"
        description="Manage gym members, their branches and assigned trainers."
      />
      {/* <div className="mx-auto"> */}
      <MemberTabs />
    </div>
  );
}

export default Members;
