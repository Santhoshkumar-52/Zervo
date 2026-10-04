import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import DataTable from "@/components/additonal/Datatable/DataTable";
import { getMembers } from "@/api/member/memberApi";
import { notifyError } from "@/utils/notification";

import { MembersColumns } from "./MembersColumns";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const getRowId = (row) => String(row.member_Id);

function MembersList() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  // `search` is what the input shows; `debouncedSearch` is what hits the API.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());

      // A new search always starts from page 1.
      setPagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const page = pagination.pageIndex + 1;
  const limit = pagination.pageSize;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["members", { page, limit, search: debouncedSearch }],
    queryFn: async () => {
      const response = await getMembers({
        page,
        limit,
        search: debouncedSearch,
      });

      // Server shape: { success, message, data: { members, pagination } }
      return response.data.data;
    },
    // Keep showing the previous page's rows while the next page loads.
    placeholderData: keepPreviousData,
  });

  const errorMessage =
    error?.response?.data?.message || error?.message || "Failed to load members";

  useEffect(() => {
    if (isError) notifyError(errorMessage);
  }, [isError, errorMessage]);

  return (
    <div className="space-y-4">
      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <DataTable
        manual
        columns={MembersColumns}
        data={data?.members ?? []}
        getRowId={getRowId}
        rowCount={data?.pagination?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Search by name, email, phone or trainer..."
      />
    </div>
  );
}

export default MembersList;
