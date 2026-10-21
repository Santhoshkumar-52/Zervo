import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Avatars shown before the "+N" count. The server sends up to 5 members.
const MAX_VISIBLE = 3;

// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const RING = "ring-2 ring-background";

/**
 * Overlapping avatars of the members assigned to a staff member, ending with
 * a "+N" circle for the rest. Clicking an avatar calls `onViewMember(id)`;
 * clicking the "+N" circle calls `onViewAll`.
 *
 *   <AssociatedMembers
 *     associated={staff.associated_members}  // { total, members: [{ id, name, avatar_url }] }
 *     onViewMember={(memberId) => ...}
 *     onViewAll={() => ...}
 *   />
 */
function AssociatedMembers({ associated, onViewMember, onViewAll }) {
  const total = associated?.total ?? 0;

  if (total === 0) {
    return <span className="text-muted-foreground">No members</span>;
  }

  const visible = (associated?.members ?? []).slice(0, MAX_VISIBLE);
  const extra = total - visible.length;

  return (
    <div
      role="group"
      aria-label={`${total} associated ${total === 1 ? "member" : "members"}`}
      className="flex items-center -space-x-2"
    >
      {visible.map((member) => {
        const avatar = (
          <Avatar className={RING}>
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt="" />
            )}

            <AvatarFallback className="text-xs">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
        );

        if (!onViewMember) {
          return (
            <span key={member.id} title={member.name} className="flex">
              {avatar}
            </span>
          );
        }

        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onViewMember(member.id)}
            aria-label={`View profile of ${member.name}`}
            title={member.name}
            className="relative flex cursor-pointer rounded-full transition-transform hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {avatar}
          </button>
        );
      })}

      {extra > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          aria-label={`View all ${total} members`}
          title={`View all ${total} members`}
          className={`relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${RING}`}
        >
          +{extra}
        </button>
      )}
    </div>
  );
}

export default AssociatedMembers;
