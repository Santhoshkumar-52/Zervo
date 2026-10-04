import { Badge } from "@/components/ui/badge";

import PlanActions from "./PlanActions";

// The server stores the price in minor units (paise): 150000 -> ₹1,500.
export const formatPrice = (priceMinor) =>
  `₹${(Number(priceMinor) / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDays = (days) => {
  const value = Number(days);

  return `${value} ${value === 1 ? "day" : "days"}`;
};

// Handlers: { onEdit, onDelete, onToggleStatus }
export const getPlanColumns = ({ onEdit, onDelete, onToggleStatus } = {}) => [
  {
    accessorKey: "id",
    header: "Plan ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "duration_days",
    header: "Duration",
    cell: ({ row }) => formatDays(row.original.duration_days),
  },
  {
    accessorKey: "price_minor",
    header: "Price",
    cell: ({ row }) => formatPrice(row.original.price_minor),
  },
  {
    accessorKey: "max_freeze_days",
    header: "Max freeze",
    cell: ({ row }) =>
      Number(row.original.max_freeze_days) > 0
        ? formatDays(row.original.max_freeze_days)
        : "—",
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
      <PlanActions
        plan={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    ),
  },
];
