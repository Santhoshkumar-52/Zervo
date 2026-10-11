import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import DetailList from "./DetailList";
import { SECTION_PADDING, formatDate, getInitials } from "./billHelpers";

// The person the bill is for (members table).
// member: { first_name, last_name, member_Id, phone, email, joined_on,
//           avatar_url, trainer: { full_name } }
// The trainer comes from users via members.assigned_trainer_id.
function MemberDetails({ member, className = "" }) {
  if (!member) return null;

  const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ");
  const memberId = member.member_Id ?? member.member_id;
  const trainer = member.trainer?.full_name ?? member.trainer_name;

  return (
    <section
      aria-labelledby="bill-member-title"
      className={`${SECTION_PADDING} ${className}`}
    >
      <h3 id="bill-member-title" className="text-sm font-semibold">
        Billed to
      </h3>

      <div className="mt-4 flex items-center gap-3">
        <Avatar size="lg">
          {member.avatar_url ? <AvatarImage src={member.avatar_url} alt="" /> : null}
          <AvatarFallback>
            {getInitials(member.first_name, member.last_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="truncate font-medium">{fullName}</p>
          {memberId != null && (
            <p className="text-sm text-muted-foreground">Member ID {memberId}</p>
          )}
        </div>
      </div>

      <DetailList
        className="mt-5"
        rows={[
          { label: "Phone", value: member.phone },
          { label: "Email", value: member.email },
          {
            label: "Member since",
            value: member.joined_on ? formatDate(member.joined_on) : undefined,
          },
          { label: "Trainer", value: trainer },
        ]}
      />
    </section>
  );
}

export default MemberDetails;
