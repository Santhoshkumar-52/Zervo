import { Badge } from "@/components/ui/badge";

import MemberActions from "./MemberActions";

// Handlers: { onEdit, onDelete, onToggleStatus, isStatusUpdating(member) }
export const getMembersColumns = ({
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating,
} = {}) => [
  {
    accessorKey: "id",
    header: "Member ID",
  },
  {
    accessorKey: "member_name",
    header: "Name",
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
    cell: ({ row }) =>
      row.original.trainer_name || (
        <span className="text-muted-foreground">Unassigned</span>
      ),
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
