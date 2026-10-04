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

import { Skeleton } from "@/components/ui/skeleton";
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

// Fixed table height.
// Every body row is forced to h-12 (3rem) and the header is h-10 (2.5rem),
// so the table area is always: header + fixedRows * row height.
// Keep these numbers in sync with the `h-10` / `h-12` classes below.
const HEADER_HEIGHT_REM = 2.5;
const ROW_HEIGHT_REM = 2.3;

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

/**
 * Two modes:
 *
 * 1. Client-side (default): pass `data`; the table sorts/filters/paginates itself.
 *
 * 2. Server-side (`manual`): the server does pagination + search. You own the
 *    state and pass it in:
 *      pagination / onPaginationChange   -> { pageIndex, pageSize }
 *      globalFilter / onGlobalFilterChange -> search text
 *      rowCount                          -> total rows across ALL pages
 *    Sorting is disabled in this mode (sorting only the current page would
 *    be misleading).
 *
 * `isLoading` (first load, no data yet) shows skeleton rows.
 * `isFetching` (refetch with previous data still on screen) dims the table.
 *
 * Height: the table area is always at least `fixedRows` rows tall (default 10),
 * so the pagination bar never jumps, whether the page has 10 rows, 2 rows,
 * is loading, or is empty. A page size larger than `fixedRows` just grows.
 */
function DataTable({
  columns,
  data = [],
  searchPlaceholder = "Search...",
  showPagination = true,
  showToolbar = true,
  enableSelection = false,
  pageSize = 10,
  fixedRows = 10,
  getRowId,

  // server-side mode
  manual = false,
  pagination,
  onPaginationChange,
  globalFilter,
  onGlobalFilterChange,
  rowCount,
  isLoading = false,
  isFetching = false,
}) {
  const table = useTable({
    features,
    columns,
    data,
    getRowId,
    enableRowSelection: enableSelection,
    enableSorting: !manual,
    manualPagination: manual,
    manualFiltering: manual,

    ...(manual
      ? {
          rowCount,
          state: { pagination, globalFilter },
          onPaginationChange,
          onGlobalFilterChange,
        }
      : {
          initialState: { pagination: { pageIndex: 0, pageSize } },
        }),
  });

  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length || 1;
  const skeletonRowCount = Math.min(table.state.pagination.pageSize, fixedRows);

  // +2px because the bordered wrapper is border-box (1px top + 1px bottom).
  const tableMinHeight = `calc(${HEADER_HEIGHT_REM + fixedRows * ROW_HEIGHT_REM}rem + 2px)`;

  return (
    <div className="flex w-full flex-col gap-4">
      <section className="flex flex-col gap-4 lg:flex-row justify-between">
        {showToolbar && (
          <DataTableToolbar
            table={table}
            searchPlaceholder={searchPlaceholder}
          />
        )}
        {showPagination && <DataTablePagination table={table} />}
      </section>

      <div
        style={{ minHeight: tableMinHeight }}
        className={`rounded-md border transition-opacity ${
          isFetching && !isLoading ? "opacity-60" : ""
        }`}
      >
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
                      className="h-10"
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
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} className="h-12">
                  {Array.from({ length: visibleColumnCount }).map(
                    (_, cellIndex) => (
                      <TableCell key={`skeleton-cell-${cellIndex}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="h-12"
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
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumnCount}
                  style={{ height: `${fixedRows * ROW_HEIGHT_REM}rem` }}
                  className="text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default DataTable;
