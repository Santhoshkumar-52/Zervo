import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

export const MembersColumns = [
  {
    accessorKey: "full_name",
    header: "Name",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "branch",
    header: "Branch",
  },
  {
    accessorKey: "trainer",
    header: "Trainer",
  },
  {
    accessorKey: "joined_on",
    header: "Joined",
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
