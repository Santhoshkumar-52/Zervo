import { Settings } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function Setting() {
  return (
    <div className="space-y-6">
      <Title
        title="Settings"
        description="Configure your gym, branches and account preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Settings
          </CardTitle>

          <CardDescription>Nothing here yet.</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is under construction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Setting;
