import { formatMoney } from "@/utils/currency";

const money = (key) => ({ row }) => formatMoney(row.original[key]);

// Items stay in the order they were added, so sorting is turned off.
export const subscriptionColumns = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "plan_name",
    header: "Plan",
  },
  {
    accessorKey: "price_minor",
    header: "Price",
    cell: money("price_minor"),
  },
  {
    accessorKey: "discount_minor",
    header: "Discount",
    cell: money("discount_minor"),
  },
  {
    accessorKey: "tax_rate",
    header: "Tax",
    cell: ({ row }) =>
      row.original.tax_name
        ? `${row.original.tax_name} (${row.original.tax_rate}%)`
        : "—",
  },
  {
    accessorKey: "tax_minor",
    header: "Tax amount",
    cell: money("tax_minor"),
  },
  {
    accessorKey: "total_minor",
    header: "Total",
    cell: money("total_minor"),
  },
].map((column) => ({ enableSorting: false, ...column }));
