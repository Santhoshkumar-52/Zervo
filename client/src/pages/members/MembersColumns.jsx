import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const MembersColumns = [
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
    cell: ({ row }) => {
      const member = row.original;

      return (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${member.member_name}`}
          onClick={() => {
            console.log("Member:", member);
          }}
        >
          <MoreHorizontal />
        </Button>
      );
    },
  },
];
