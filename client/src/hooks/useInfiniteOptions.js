import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

/**
 * Pages through a server list for a dropdown (infinite scroll).
 *
 * `source` describes the list:
 *   key        unique react-query key
 *   fetchPage  ({ page, limit, search }) => Promise<{ items, pagination }>
 *
 * Nothing is requested until `enabled` is true (the dropdown is open). The
 * first page is loaded on open, `fetchNextPage` loads the next one, and a new
 * `search` starts again from page 1.
 */
export function useInfiniteOptions({
  source,
  search = "",
  enabled = true,
  pageSize = 20,
}) {
  const query = useInfiniteQuery({
    queryKey: [source.key, { search, pageSize }],
    queryFn: ({ pageParam }) =>
      source.fetchPage({ page: pageParam, limit: pageSize, search }),
    initialPageParam: 1,
    getNextPageParam: ({ pagination }) =>
      pagination.hasNextPage ? pagination.page + 1 : undefined,
    // Keep the previous results on screen while a new search loads.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
  });

  const options = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
