import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import { getBranchList } from "@/api/branch/branchApi";
import Field from "@/components/additonal/Field";
import { BRANCH_SWITCH_GROUP_ID } from "@/components/additonal/BranchFilter";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";

const EMPTY = "\u2014";

const NO_BRANCHES = [];

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children || EMPTY}</dd>
    </div>
  );
}

/**
 * Branch settings: a dropdown of every branch (GET /api/branch) and the
 * details of the one selected. Only the owner (group 1) can list the branches,
 * so everyone else sees a short notice instead of the dropdown.
 *
 * The dropdown starts on the user's own branch. Picking a branch here only
 * changes which one is shown; nothing is saved yet.
 */
function BranchSettings() {
  const groupId = useAuthStore((state) => state.user?.groupId);
  const userBranchId = useAuthStore((state) => state.user?.branchId);

  const isOwner = Number(groupId) === BRANCH_SWITCH_GROUP_ID;

  // null until the owner picks one; then the dropdown follows the pick.
  const [pickedId, setPickedId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranchList,
    enabled: isOwner,
  });

  const branches = data?.branches ?? NO_BRANCHES;

  // The select works with string values, branch ids are numbers.
  const items = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id),
        label: branch.is_active ? branch.name : `${branch.name} (inactive)`,
      })),
    [branches],
  );

  // Own branch first; fall back to the first branch if it is not in the list.
  const selectedId =
    pickedId ??
    (branches.some((branch) => branch.id === userBranchId)
      ? userBranchId
      : (branches[0]?.id ?? null));

  const selected = branches.find((branch) => branch.id === selectedId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5" />
          Branch
        </CardTitle>

        <CardDescription>
          Pick a branch to see its details.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isOwner ? (
          <p className="text-sm text-muted-foreground">
            Only the owner can view all branches.
          </p>
        ) : (
          <>
            <Field label="Branch" htmlFor="settings-branch">
              <Select
                items={items}
                value={selectedId == null ? "" : String(selectedId)}
                onValueChange={(next) => next && setPickedId(Number(next))}
                disabled={isLoading || items.length === 0}
              >
                <SelectTrigger id="settings-branch" className="w-64">
                  <SelectValue
                    placeholder={
                      isLoading ? "Loading branches..." : "Select a branch"
                    }
                  />
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

            {isError && (
              <p className="text-sm text-destructive" role="alert">
                {getApiError(error, "Failed to load branches")}
              </p>
            )}

            {isLoading && (
              <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            )}

            {selected && (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Name">{selected.name}</Detail>
                <Detail label="Code">{selected.code}</Detail>
                <Detail label="Status">
                  <Badge variant={selected.is_active ? "default" : "secondary"}>
                    {selected.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Detail>
                <Detail label="Phone">{selected.phone}</Detail>
                <Detail label="Currency">{selected.currency}</Detail>
                <Detail label="Address">{selected.address}</Detail>
                <Detail label="Bill page">{selected.subbill_url}</Detail>
                <Detail label="Receipt page">{selected.receipt_url}</Detail>
              </dl>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BranchSettings;
