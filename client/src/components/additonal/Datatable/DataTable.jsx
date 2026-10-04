import {
  flexRender,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import DataTablePagination from "./DataTablePagination";
import DataTableToolbar from "./DataTableToolbar";

// TanStack Table v9: every feature, row model and fn registry must be
// registered explicitly. globalFilteringFeature REQUIRES columnFilteringFeature,
// and the filtered/sorted row models need their fn registries (filterFns/sortFns).
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,

  filterFns,
  sortFns,

  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

function SortIcon({ direction }) {
  if (direction === "asc") return <ArrowUp className="size-4" />;
  if (direction === "desc") return <ArrowDown className="size-4" />;
  return <ChevronsUpDown className="size-4 opacity-50" />;
}

function DataTable({
  columns,
  data = [],
  searchPlaceholder = "Search...",
  showPagination = true,
  showToolbar = true,
  enableSelection = false,
  pageSize = 10,
}) {
  // The table owns its own state (sorting, globalFilter, pagination, ...).
  // Read it via `table.state` — `table.getState()` no longer exists in v9.
  const table = useTable({
    features,
    columns,
    data,
    enableRowSelection: enableSelection,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="w-full space-y-4">
      {showToolbar && (
        <DataTableToolbar table={table} searchPlaceholder={searchPlaceholder} />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex cursor-pointer select-none items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <SortIcon direction={sorted} />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length || 1}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && <DataTablePagination table={table} />}
    </div>
  );
}

export default DataTable;
