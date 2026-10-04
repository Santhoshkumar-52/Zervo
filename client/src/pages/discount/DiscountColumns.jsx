import { Badge } from "@/components/ui/badge";

import DiscountActions from "./DiscountActions";

const formatValue = (discount) =>
  discount.type === "percentage"
    ? `${discount.value}%`
    : `₹${Number(discount.value).toLocaleString("en-IN")}`;

// Handlers: { onEdit, onDelete, onToggleStatus }
export const getDiscountColumns = ({
  onEdit,
  onDelete,
  onToggleStatus,
} = {}) => [
  {
    accessorKey: "id",
    header: "Discount ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) =>
      row.original.type === "percentage" ? "Percentage" : "Fixed amount",
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => formatValue(row.original),
  },
  {
    accessorKey: "valid_from",
    header: "Valid from",
    cell: ({ row }) => row.original.valid_from || "—",
  },
  {
    accessorKey: "valid_to",
    header: "Valid to",
    cell: ({ row }) => row.original.valid_to || "—",
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
      <DiscountActions
        discount={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    ),
  },
];
