import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function DataTableToolbar({ table, searchPlaceholder = "Search..." }) {
  const globalFilter = table.state.globalFilter ?? "";

  const isFiltered = globalFilter.length > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-9 max-w-sm"
        />

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.setGlobalFilter("")}
            className="h-9 px-3"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

export default DataTableToolbar;
