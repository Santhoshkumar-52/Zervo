import Title from "@/components/additonal/Title";

import BranchSettings from "./BranchSettings";

function Setting() {
  return (
    <div className="space-y-6">
      <Title
        title="Settings"
        description="Configure your gym, branches and account preferences."
      />

      <BranchSettings />
    </div>
  );
}

export default Setting;
