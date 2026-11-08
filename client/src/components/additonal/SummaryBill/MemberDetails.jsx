import DetailList from "./DetailList";
import { LABEL, PAD } from "./billStyles";
import { formatDate, getInitials } from "./billHelpers";

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
      className={`${PAD} ${className}`}
    >
      <h3 id="bill-member-title" className={LABEL}>
        Billed to
      </h3>

      <div className="mt-3 flex items-center gap-3">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt=""
            className="size-12 shrink-0 rounded-full border border-zinc-300 object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-base font-bold text-white [print-color-adjust:exact]"
          >
            {getInitials(member.first_name, member.last_name)}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold break-words">{fullName}</p>
          {memberId != null && (
            <p className="mt-0.5 text-sm text-zinc-600">
              Member ID <span className="font-semibold text-zinc-900">{memberId}</span>
            </p>
          )}
        </div>
      </div>

      <DetailList
        className="mt-3"
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
