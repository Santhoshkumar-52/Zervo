import { Badge } from "@/components/ui/badge";

import DiscountActions from "./DiscountActions";

// `type_name` is saved by the server ("percentage" | "fixed").
// `value` arrives as a decimal string ("10.00"), so convert it first.
const formatValue = (discount) =>
  discount.type_name === "percentage"
    ? `${Number(discount.value)}%`
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
    accessorKey: "type_name",
    header: "Type",
    cell: ({ row }) =>
      row.original.type_name === "percentage" ? "Percentage" : "Fixed amount",
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => formatValue(row.original),
  },
  {
    accessorKey: "starts_on",
    header: "Valid from",
    cell: ({ row }) => row.original.starts_on || "—",
  },
  {
    accessorKey: "ends_on",
    header: "Valid to",
    cell: ({ row }) => row.original.ends_on || "—",
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
