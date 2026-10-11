import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteOptions } from "@/hooks/useInfiniteOptions";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;
// Load the next page when the list is this close to the bottom.
const SCROLL_THRESHOLD_PX = 48;

function StatusRow({ children }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-t px-2 py-2 text-xs text-muted-foreground"
    >
      {children}
    </div>
  );
}

/**
 * Searchable dropdown that loads its options from the server, 20 at a time.
 *
 *   <AsyncCombobox
 *     id="member"
 *     source={memberSource}
 *     value={member}                 // the selected item object, or null
 *     onValueChange={setMember}
 *   />
 *
 * `source` is { key, fetchPage, getLabel, renderOption? } (see useInfiniteOptions).
 * Opening the dropdown loads page 1, scrolling to the end loads the next
 * page, and typing searches on the server (debounced).
 */
function AsyncCombobox({
  id,
  source,
  value,
  onValueChange,
  placeholder = "Search...",
  clearable = false,
  disabled = false,
  invalid = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DELAY_MS);

  const {
    options,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteOptions({
    source,
    search: debouncedSearch,
    enabled: open,
    pageSize: PAGE_SIZE,
  });

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);

    // The next time it opens, start from the unfiltered first page.
    if (!nextOpen) setSearch("");
  };

  // Picking an item also rewrites the input text. That is not a search.
  const handleInputValueChange = (text) => {
    if (value && text === source.getLabel(value)) return;

    setSearch(text);
  };

  const handleScroll = (event) => {
    const list = event.currentTarget;
    const distanceToEnd =
      list.scrollHeight - list.scrollTop - list.clientHeight;

    if (
      distanceToEnd < SCROLL_THRESHOLD_PX &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isError
    ) {
      fetchNextPage();
    }
  };

  return (
    <Combobox
      items={options}
      value={value ?? null}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={handleOpenChange}
      onInputValueChange={handleInputValueChange}
      // The server does the searching, so skip the built-in filtering.
      filter={null}
      itemToStringLabel={source.getLabel}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder={placeholder}
        showClear={clearable}
        disabled={disabled}
        aria-invalid={invalid}
      />

      <ComboboxContent>
        <ComboboxEmpty>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading...
            </span>
          ) : isError ? (
            <span className="flex items-center gap-1">
              Could not load.
              <Button variant="link" size="xs" onClick={() => refetch()}>
                Retry
              </Button>
            </span>
          ) : (
            "No results found."
          )}
        </ComboboxEmpty>

        <ComboboxList onScroll={handleScroll}>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {source.renderOption?.(item) ?? source.getLabel(item)}
            </ComboboxItem>
          )}
        </ComboboxList>

        {isFetchingNextPage && (
          <StatusRow>
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading more...
          </StatusRow>
        )}

        {isError && options.length > 0 && (
          <StatusRow>
            Could not load more.
            <Button variant="link" size="xs" onClick={() => fetchNextPage()}>
              Retry
            </Button>
          </StatusRow>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export default AsyncCombobox;
