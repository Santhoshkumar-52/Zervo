import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import DataTable from "@/components/additonal/Datatable/DataTable";
import {
  deleteMember,
  getMembers,
  updateMemberStatus,
} from "@/api/member/memberApi";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notification";

import { getMembersColumns } from "./MembersColumns";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const getRowId = (row) => String(row.member_Id);

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

function MembersList() {
  const queryClient = useQueryClient();
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

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: ["members"] });

  const statusMutation = useMutation({
    mutationFn: ({ member, isActive }) =>
      updateMemberStatus(member.member_Id, isActive),
    onSuccess: (_, { member, isActive }) => {
      notifySuccess(
        `${member.member_name} marked as ${isActive ? "active" : "inactive"}`,
      );
      invalidateMembers();
    },
    onError: (err) =>
      notifyError(getApiError(err, "Failed to update member status")),
  });

  const deleteMutation = useMutation({
    mutationFn: (member) => deleteMember(member.member_Id),
    onSuccess: (_, member) => {
      notifySuccess(`${member.member_name} deleted`);
      invalidateMembers();
    },
    onError: (err) => notifyError(getApiError(err, "Failed to delete member")),
  });

  const { mutate: changeStatus, isPending: isStatusPending, variables: statusVars } =
    statusMutation;
  const { mutate: removeMember } = deleteMutation;

  const columns = useMemo(
    () =>
      getMembersColumns({
        // TODO: navigate to the edit screen once that route exists.
        onEdit: (member) =>
          notifyInfo(`Editing ${member.member_name} is coming soon`),
        onDelete: (member) => {
          if (window.confirm(`Delete ${member.member_name}? This cannot be undone.`)) {
            removeMember(member);
          }
        },
        onToggleStatus: (member, isActive) =>
          changeStatus({ member, isActive }),
        isStatusUpdating: (member) =>
          isStatusPending && statusVars?.member.member_Id === member.member_Id,
      }),
    [changeStatus, removeMember, isStatusPending, statusVars],
  );

  return (
    <div className="space-y-4">
      {isError && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <DataTable
        manual
        columns={columns}
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
