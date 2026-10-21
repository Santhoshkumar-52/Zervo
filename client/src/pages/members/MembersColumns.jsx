import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import MemberActions from "./MemberActions";

// "Ravi Kumar" -> "RK"
const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

// Handlers: { onEdit, onDelete, onToggleStatus, isStatusUpdating(member),
//             onViewProfile(memberId), onViewTrainer(staffId) }
// onViewProfile is called when the member name is clicked, onViewTrainer when
// the assigned trainer's name is clicked.
export const getMembersColumns = ({
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating,
  onViewProfile,
  onViewTrainer,
} = {}) => [
  {
    accessorKey: "id",
    header: "Member ID",
  },
  {
    accessorKey: "member_name",
    header: "Name",
    cell: ({ row }) => {
      const member = row.original;
      const name = member.member_name;

      return (
        <div className="flex items-center gap-2.5">
          <Avatar>
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt="" />
            )}

            <AvatarFallback className="text-xs">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          {name && onViewProfile ? (
            <button
              type="button"
              onClick={() => onViewProfile(member.id)}
              aria-label={`View profile of ${name}`}
              className="cursor-pointer rounded-sm text-left font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {name}
            </button>
          ) : (
            <span className="font-medium">{name || "\u2014"}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "—",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone || "—",
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
  },
  {
    accessorKey: "trainer_name",
    header: "Trainer",
    cell: ({ row }) => {
      const {
        trainer_name: name,
        trainer_avatar_url: avatarUrl,
        assigned_trainer_id: trainerId,
      } = row.original;

      if (!name) {
        return <span className="text-muted-foreground">Unassigned</span>;
      }

      return (
        <div className="flex items-center gap-2.5">
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}

            <AvatarFallback className="text-xs">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          {trainerId && onViewTrainer ? (
            <button
              type="button"
              onClick={() => onViewTrainer(trainerId)}
              aria-label={`View profile of ${name}`}
              className="cursor-pointer rounded-sm text-left hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {name}
            </button>
          ) : (
            <span>{name}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const active = Boolean(row.original.is_active);

      return (
        <Badge variant={active ? "success" : "destructive"}>
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <MemberActions
        member={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
        isStatusUpdating={isStatusUpdating?.(row.original) ?? false}
      />
    ),
  },
];
