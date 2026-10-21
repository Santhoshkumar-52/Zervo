import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { getMemberById } from "@/api/member/memberApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const EMPTY = "\u2014";

// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

/**
 * The member picked in the dropdown: avatar, name and member ID in one
 * button. Clicking it calls `onOpen` (the parent opens the profile modal).
 *
 * The details are fetched by id (GET /api/member/:id). Until they arrive, the
 * record the dropdown already holds is shown, so the card is never empty. The
 * query key is the one ProfileViewer uses, so the modal opens with the data
 * already in the cache.
 *
 *   <SelectedMember member={member} onOpen={() => setProfileOpen(true)} />
 */
function SelectedMember({ member, onOpen }) {
  const { data } = useQuery({
    queryKey: ["member-profile", member?.id],
    // { member, subscription } - only `member` is used here.
    queryFn: () => getMemberById(member.id).then((res) => res.data.data),
    enabled: Boolean(member?.id),
    staleTime: 60_000,
  });

  if (!member?.id) return null;

  const details = data?.member ?? member;
  const name = details.member_name || member.member_name;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View profile of ${name || "member"}`}
      className="group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Avatar>
        {details.avatar_url && (
          <AvatarImage src={details.avatar_url} alt="" />
        )}

        <AvatarFallback className="text-xs">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate font-medium">{name || EMPTY}</span>

        <span className="text-xs text-muted-foreground">
          Member ID {details.member_Id ?? EMPTY}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground group-hover:text-foreground">
        <span className="hidden sm:inline">View profile</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}

export default SelectedMember;
