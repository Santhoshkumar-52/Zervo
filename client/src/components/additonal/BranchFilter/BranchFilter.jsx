import { useMemo } from "react";

import Field from "@/components/additonal/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useInitStore } from "@/store/init";

// Only this group (the owner) may pick a branch. Everyone else is locked to
// their own branch, so the dropdown is hidden for them.
export const BRANCH_SWITCH_GROUP_ID = 1;

/**
 * Branch filter: a dropdown of the active branches loaded after login
 * (useInitStore.branches), meant to sit next to the DateRangeFilter.
 *
 *   - groupId === 1: the dropdown is shown and editable.
 *   - any other group (or an unknown group): nothing is rendered, so the
 *     branch can't be changed. Keep the user's own branch as the value:
 *
 *       const branchId = useAuthStore((s) => s.user?.branchId);
 *       const [branch, setBranch] = useState(branchId);
 *
 * Controlled: `value` is the branch id (number) and `onChange` gets the new
 * branch id (number).
 *
 *   <BranchFilter value={branch} onChange={setBranch} />
 */
function BranchFilter({ value, onChange, disabled = false, className }) {
  const groupId = useAuthStore((state) => state.user?.groupId);
  const branches = useInitStore((state) => state.branches);
  const isLoading = useInitStore((state) => state.isLoading);

  // The select works with string values, branch ids are numbers.
  const items = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    [branches],
  );

  // Not allowed to switch branch: hide the dropdown.
  if (groupId !== BRANCH_SWITCH_GROUP_ID) return null;

  const handleChange = (nextValue) => {
    if (!nextValue) return;

    onChange(Number(nextValue));
  };

  return (
    <div className={cn("flex flex-wrap items-start gap-3", className)}>
      <Field label="Branch" htmlFor="branch-filter">
        <Select
          items={items}
          value={value == null ? "" : String(value)}
          onValueChange={handleChange}
          disabled={disabled || isLoading || items.length === 0}
        >
          <SelectTrigger id="branch-filter" className="w-48">
            <SelectValue placeholder="Select a branch" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export default BranchFilter;
