import { CircleAlert, LogIn, SearchX, UserSearch } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { EMPTY_VALUE, formatDate, getInitials } from "./attendanceHelpers";

function Message({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children || EMPTY_VALUE}</dd>
    </div>
  );
}

// Right column: shows the member that was looked up and the check-in button.
//
//   status        "idle" | "loading" | "found" | "not-found" | "error"
//   alreadyIn     true when this member already checked in this session
//   onCheckIn()   records the check-in for `member`
function MemberDetailsPanel({
  status,
  member,
  memberId,
  alreadyIn,
  isCheckingIn,
  onCheckIn,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Member details</h2>
        </CardTitle>
        <CardDescription>Confirm who it is, then check them in.</CardDescription>
      </CardHeader>

      <CardContent aria-live="polite">
        {status === "idle" && (
          <Message icon={UserSearch} title="No member selected">
            Search by member ID to see their details here.
          </Message>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-4" aria-busy="true">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        )}

        {status === "not-found" && (
          <Message icon={SearchX} title={`No member with ID ${memberId}`}>
            Check the number and try again. Only members of this branch are
            found.
          </Message>
        )}

        {status === "error" && (
          <Message icon={CircleAlert} title="Could not look up the member">
            Something went wrong. Please try again.
          </Message>
        )}

        {status === "found" && member && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16">
                <AvatarImage src={member.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-lg">
                  {getInitials(member.member_name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">
                  {member.member_name}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  ID {member.member_Id}
                </p>
              </div>

              <Badge variant={member.is_active ? "secondary" : "destructive"}>
                {member.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Phone">{member.phone}</Detail>
              <Detail label="Email">{member.email}</Detail>
              <Detail label="Joined on">{formatDate(member.joined_on)}</Detail>
              <Detail label="Trainer">{member.trainer_name}</Detail>
              <Detail label="Branch">{member.branch_name}</Detail>
            </dl>

            {!member.is_active && (
              <p className="text-sm text-destructive" role="alert">
                This member is inactive and cannot be checked in.
              </p>
            )}

            {alreadyIn && (
              <p className="text-sm text-muted-foreground">
                Already checked in this session.
              </p>
            )}

            <Button
              size="lg"
              onClick={onCheckIn}
              disabled={!member.is_active || alreadyIn || isCheckingIn}
            >
              <LogIn aria-hidden="true" />
              {isCheckingIn ? "Checking in..." : "Check in"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MemberDetailsPanel;
