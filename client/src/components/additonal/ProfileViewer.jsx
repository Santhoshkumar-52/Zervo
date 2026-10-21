import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import { getMemberById } from "@/api/member/memberApi";
import StaffProfileViewer from "@/components/additonal/StaffProfileViewer";
import { formatDate } from "@/components/additonal/SummaryBill/billHelpers";
import StaffEditor from "@/pages/staff/StaffEditor";
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
import { formatMoney } from "@/utils/currency";

const EMPTY = "\u2014";

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// "male" -> "Male"
const capitalize = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : EMPTY;

// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const SUBSCRIPTION_STATUS = {
  active: { label: "Active", variant: "secondary" },
  upcoming: { label: "Upcoming", variant: "outline" },
  expired: { label: "Expired", variant: "destructive" },
};

// "Gold plan" or, for more than one, "Gold plan x 2"
const formatItemName = (item) =>
  item.quantity > 1 ? `${item.item_name} x ${item.quantity}` : item.item_name;

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
    <section
      aria-label={title}
      className={`min-w-0 space-y-4 ${className}`}
    >
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

          {Array.from({ length: 6 }).map((_, index) => (
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

// onViewTrainer(trainerId) is called when the trainer name is clicked.
function ProfileDetailsPanel({ member, onViewTrainer }) {
  const name = member.member_name || EMPTY;

  return (
    <Panel title="Profile details">
      <div className="flex items-center gap-3">
        <Avatar className="size-14 shrink-0">
          {member.avatar_url && (
            <AvatarImage src={member.avatar_url} alt={name} />
          )}

          <AvatarFallback className="text-base">
            {getInitials(member.member_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-base font-medium">{name}</span>

          <span className="text-xs text-muted-foreground">
            Member ID {member.member_Id ?? EMPTY}
          </span>

          <Badge
            variant={member.is_active ? "secondary" : "destructive"}
            className="w-fit"
          >
            {member.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        <DetailRow label="Phone">{member.phone}</DetailRow>
        <DetailRow label="Email">{member.email}</DetailRow>
        <DetailRow label="Gender">{capitalize(member.gender)}</DetailRow>
        <DetailRow label="Date of birth">
          {member.dob ? formatDate(member.dob) : null}
        </DetailRow>
        <DetailRow label="Joined on">
          {member.joined_on ? formatDate(member.joined_on) : null}
        </DetailRow>
        <DetailRow label="Branch">{member.branch_name}</DetailRow>
        <DetailRow label="Trainer">
          {member.trainer_name ? (
            <div className="flex flex-col leading-tight">
              {member.trainer_id && onViewTrainer ? (
                <button
                  type="button"
                  onClick={() => onViewTrainer(member.trainer_id)}
                  aria-label={`View profile of ${member.trainer_name}`}
                  className="w-fit cursor-pointer rounded-sm text-left font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {member.trainer_name}
                </button>
              ) : (
                <span>{member.trainer_name}</span>
              )}

              {member.trainer_email && (
                <span className="text-xs text-muted-foreground">
                  {member.trainer_email}
                </span>
              )}
            </div>
          ) : null}
        </DetailRow>
      </dl>
    </Panel>
  );
}

function SubscriptionDetailsPanel({ subscription }) {
  const panelClass =
    "border-t pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6";

  if (!subscription) {
    return (
      <Panel title="Subscription details" className={panelClass}>
        <p className="text-sm text-muted-foreground">
          This member has no subscription yet.
        </p>
      </Panel>
    );
  }

  const status =
    SUBSCRIPTION_STATUS[subscription.status] ?? SUBSCRIPTION_STATUS.expired;

  const daysLeft = subscription.days_left;

  return (
    <Panel
      title="Subscription details"
      className={panelClass}
      badge={<Badge variant={status.variant}>{status.label}</Badge>}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        <DetailRow label="Plan">
          {subscription.items.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {subscription.items.map((item, index) => (
                <li key={index}>{formatItemName(item)}</li>
              ))}
            </ul>
          ) : null}
        </DetailRow>

        <DetailRow label="Subscription no">
          {subscription.subscription_no}
        </DetailRow>

        <DetailRow label="Start date">
          {formatDate(subscription.start_date)}
        </DetailRow>

        <DetailRow label="End date">
          {formatDate(subscription.end_date)}
        </DetailRow>

        {subscription.status === "active" && (
          <DetailRow label="Days left">
            {daysLeft === 0
              ? "Expires today"
              : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
          </DetailRow>
        )}

        <DetailRow label="Bill no">{subscription.bill_no}</DetailRow>

        <DetailRow label="Total">
          {formatMoney(subscription.total_price)}
        </DetailRow>
      </dl>
    </Panel>
  );
}

/**
 * Read-only member profile in a modal. Controlled: the parent owns `open`.
 * The member (and their latest subscription, when they have one) is loaded
 * from GET /api/member/:id every time the modal opens (the query is not
 * trusted as fresh), so the profile is never out of date.
 *
 * Layout: "Profile details" on the left, "Subscription details" on the right
 * from the `sm` breakpoint up; on phones the two panels stack vertically. The
 * middle of the modal scrolls when the content is taller than the screen.
 *
 * Clicking the trainer name opens that trainer's StaffProfileViewer on top.
 *
 * Pass `onEdit` to show an Edit icon button next to the close button. It closes
 * this modal first, then calls `onEdit(memberId)` so the parent can open the
 * edit dialog. Without `onEdit` the modal stays read-only.
 *
 *   <ProfileViewer
 *     open={open}
 *     onOpenChange={setOpen}
 *     memberId={member.id}   // members.id (internal id), not member_Id
 *     onEdit={(id) => ...}   // optional
 *   />
 */
function ProfileViewer({ open, onOpenChange, memberId, onEdit }) {
  // Trainer whose profile is open on top of this modal.
  const [trainerId, setTrainerId] = useState(null);
  const [trainerOpen, setTrainerOpen] = useState(false);
  const [trainerEditOpen, setTrainerEditOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["member-profile", memberId],
    // { member, subscription } - subscription is null when there is none.
    queryFn: () => getMemberById(memberId).then((res) => res.data.data),
    // Only call the API while the modal is open and there is an id.
    enabled: Boolean(open && memberId),
    // Always stale, so every time the modal opens it fetches again. Rows from
    // an earlier open stay on screen while the new request is running.
    staleTime: 0,
  });

  const handleEdit = () => {
    onOpenChange?.(false);
    onEdit?.(memberId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
          {/* The close button sits at right-2; Edit goes just left of it. */}
          <DialogHeader className="pr-16">
            <DialogTitle>Profile</DialogTitle>
            <DialogDescription>Member and subscription details</DialogDescription>
          </DialogHeader>

          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-10"
              onClick={handleEdit}
              disabled={!memberId}
              aria-label="Edit member"
              title="Edit member"
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
                <ProfileDetailsPanel
                  member={data.member}
                  onViewTrainer={(id) => {
                    setTrainerId(id);
                    setTrainerOpen(true);
                  }}
                />

                <SubscriptionDetailsPanel subscription={data.subscription} />
              </div>
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <StaffProfileViewer
        open={trainerOpen}
        onOpenChange={setTrainerOpen}
        staffId={trainerId}
        onEdit={() => setTrainerEditOpen(true)}
      />

      <StaffEditor
        open={trainerEditOpen}
        onOpenChange={setTrainerEditOpen}
        staffId={trainerId}
      />
    </>
  );
}

export default ProfileViewer;
