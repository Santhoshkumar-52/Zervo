import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import EditMemberDialog from "./EditMemberDialog";
import {
  deleteMember,
  getMembers,
  updateMember,
  updateMemberStatus,
} from "@/api/member/memberApi";
import { notifyError, notifySuccess } from "@/utils/notification";

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

  // Edit dialog. `memberToEdit` is kept while the dialog animates closed so
  // its content does not flicker.
  const [editOpen, setEditOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);

  // Delete confirmation dialog. `memberToDelete` is kept while the dialog
  // animates closed so its text does not flicker.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

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

  const updateMutation = useMutation({
    mutationFn: ({ member, values }) => updateMember(member.id, values),
    onSuccess: (_, { member }) => {
      notifySuccess(`${member.member_name} updated`);
      invalidateMembers();
    },
    onError: (err) => notifyError(getApiError(err, "Failed to update member")),
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
  // mutateAsync: the dialog waits for it and stays open if the delete fails.
  const { mutateAsync: removeMember } = deleteMutation;
  // mutateAsync: the dialog waits for it and stays open if the update fails.
  const { mutateAsync: saveMember } = updateMutation;

  const columns = useMemo(
    () =>
      getMembersColumns({
        onEdit: (member) => {
          setMemberToEdit(member);
          setEditOpen(true);
        },
        onDelete: (member) => {
          setMemberToDelete(member);
          setDeleteOpen(true);
        },
        onToggleStatus: (member, isActive) =>
          changeStatus({ member, isActive }),
        isStatusUpdating: (member) =>
          isStatusPending && statusVars?.member.member_Id === member.member_Id,
      }),
    [changeStatus, isStatusPending, statusVars],
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

      <EditMemberDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        member={memberToEdit}
        isLoading={updateMutation.isPending}
        onSubmit={(values, member) => saveMember({ member, values })}
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${memberToDelete?.member_name ?? "member"}?`}
        description="This permanently removes the member and cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => removeMember(memberToDelete)}
      />
    </div>
  );
}

export default MembersList;
