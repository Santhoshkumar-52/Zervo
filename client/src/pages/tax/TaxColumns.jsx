import { Badge } from "@/components/ui/badge";

import TaxActions from "./TaxActions";

// Handlers: { onEdit, onDelete, onToggleStatus }
export const getTaxColumns = ({ onEdit, onDelete, onToggleStatus } = {}) => [
  {
    accessorKey: "id",
    header: "Tax ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "rate",
    header: "Rate",
    // The DB returns a decimal string ("18.00"); show it as 18%.
    cell: ({ row }) => `${Number(row.original.rate)}%`,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description || "—",
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
      <TaxActions
        tax={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    ),
  },
];
