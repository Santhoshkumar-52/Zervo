import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import { getStaffById } from "@/api/staff/staffApi";
import { formatDate } from "@/components/additonal/SummaryBill/billHelpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY = "\u2014";

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// "male" -> "Male"
const capitalize = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : EMPTY;

// "front_desk" -> "Front desk"
const formatGroup = (name) =>
  name ? capitalize(name.replace(/_/g, " ")) : EMPTY;

// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

function DetailRow({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children || EMPTY}</dd>
    </div>
  );
}

// One half of the modal: a heading (with an optional badge) and its content.
function Panel({ title, badge, className = "", children }) {
  return (
    <section aria-label={title} className={`min-w-0 space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>

        {badge}
      </div>

      {children}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2"
    >
      <span className="sr-only">Loading profile</span>

      {[0, 1].map((panel) => (
        <div key={panel} className="space-y-4">
          <Skeleton className="h-4 w-28" />

          {panel === 0 && (
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 shrink-0 rounded-full" />

              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-full max-w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          )}

          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full max-w-28" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProfileDetailsPanel({ staff }) {
  const name = staff.full_name || EMPTY;

  return (
    <Panel title="Profile details">
      <div className="flex items-center gap-3">
        <Avatar className="size-14 shrink-0">
          {staff.avatar_url && <AvatarImage src={staff.avatar_url} alt={name} />}

          <AvatarFallback className="text-base">
            {getInitials(staff.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-base font-medium">{name}</span>

          <span className="text-xs text-muted-foreground">
            User ID {staff.user_id ?? EMPTY}
          </span>

          <Badge
            variant={staff.is_active ? "secondary" : "destructive"}
            className="w-fit"
          >
            {staff.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        <DetailRow label="Mobile">{staff.phone}</DetailRow>
        <DetailRow label="Email">{staff.email}</DetailRow>
        <DetailRow label="Gender">{capitalize(staff.gender)}</DetailRow>
      </dl>
    </Panel>
  );
}

function WorkDetailsPanel({ staff }) {
  return (
    <Panel
      title="Work details"
      className="border-t pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        <DetailRow label="Group">{formatGroup(staff.group_name)}</DetailRow>
        <DetailRow label="Branch">{staff.branch_name}</DetailRow>
        <DetailRow label="User ID">{staff.user_id}</DetailRow>
        <DetailRow label="Added on">
          {staff.created_at ? formatDate(staff.created_at) : null}
        </DetailRow>
      </dl>
    </Panel>
  );
}

/**
 * Read-only staff profile in a modal. Controlled: the parent owns `open`.
 * The staff member is loaded from GET /api/staff/:id every time the modal
 * opens (the query is not trusted as fresh), so the profile is never out of
 * date.
 *
 * Layout: "Profile details" on the left, "Work details" on the right from the
 * `sm` breakpoint up; on phones the two panels stack vertically. The middle of
 * the modal scrolls when the content is taller than the screen.
 *
 * Pass `onEdit` to show an Edit icon button next to the close button. It closes
 * this modal first, then calls `onEdit(staffId)` so the parent can open the
 * edit dialog. Without `onEdit` the modal stays read-only.
 *
 *   <StaffProfileViewer
 *     open={open}
 *     onOpenChange={setOpen}
 *     staffId={staff.id}   // users.id (internal id), not user_id
 *     onEdit={(id) => ...} // optional
 *   />
 */
function StaffProfileViewer({ open, onOpenChange, staffId, onEdit }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["staff-profile", staffId],
    // { staff }
    queryFn: () => getStaffById(staffId).then((res) => res.data.data.staff),
    // Only call the API while the modal is open and there is an id.
    enabled: Boolean(open && staffId),
    // Always stale, so every time the modal opens it fetches again. Data from
    // an earlier open stays on screen while the new request is running.
    staleTime: 0,
  });

  const handleEdit = () => {
    onOpenChange?.(false);
    onEdit?.(staffId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        {/* The close button sits at right-2; Edit goes just left of it. */}
        <DialogHeader className="pr-16">
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Staff details</DialogDescription>
        </DialogHeader>

        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-10"
            onClick={handleEdit}
            disabled={!staffId}
            aria-label="Edit staff member"
            title="Edit staff member"
          >
            <Pencil />
          </Button>
        )}

        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          {isLoading && <ProfileSkeleton />}

          {isError && !data && (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">
                {getApiError(error, "Failed to load the profile")}
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? "Retrying..." : "Try again"}
              </Button>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ProfileDetailsPanel staff={data} />

              <WorkDetailsPanel staff={data} />
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export default StaffProfileViewer;
