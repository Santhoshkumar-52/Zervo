import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { deleteStaff, getStaff, updateStaffStatus } from "@/api/staff/staffApi";
import { useStaffStore } from "@/store/staff";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notification";

import { getStaffColumns } from "./StaffColumns";

const SEARCH_DEBOUNCE_MS = 400;

const getRowId = (row) => String(row.id);

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

function StaffList() {
  const queryClient = useQueryClient();

  // Table state (search text + pagination) lives in the staff store.
  const search = useStaffStore((state) => state.search);
  const setSearch = useStaffStore((state) => state.setSearch);
  const pagination = useStaffStore((state) => state.pagination);
  const setPagination = useStaffStore((state) => state.setPagination);

  // The fetched list lives in the store too.
  const staff = useStaffStore((state) => state.staff);
  const total = useStaffStore((state) => state.total);
  const setStaff = useStaffStore((state) => state.setStaff);
  const updateStaffInList = useStaffStore((state) => state.updateStaffInList);
  const removeStaffFromList = useStaffStore(
    (state) => state.removeStaffFromList,
  );

  // Kept while the dialog animates closed so its text does not flicker.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);

  // { staff, isActive } for the status confirmation dialog.
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusChange, setStatusChange] = useState(null);

  // `search` is what the input shows; `debouncedSearch` is what hits the API.
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [search]);

  const page = pagination.pageIndex + 1;
  const limit = pagination.pageSize;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["staff", { page, limit, search: debouncedSearch }],
    queryFn: async () => {
      const response = await getStaff({
        page,
        limit,
        search: debouncedSearch,
      });

      // Server shape: { success, message, data: { staff, pagination } }
      return response.data.data;
    },
    // Keep showing the previous page's rows while the next page loads.
    placeholderData: keepPreviousData,
  });

  // Copy each fetched page into the store (the table renders from the store).
  useEffect(() => {
    if (data) setStaff({ staff: data.staff, total: data.pagination.total });
  }, [data, setStaff]);

  const errorMessage = getApiError(error, "Failed to load staff");

  useEffect(() => {
    if (isError) notifyError(errorMessage);
  }, [isError, errorMessage]);

  const invalidateStaff = () =>
    queryClient.invalidateQueries({ queryKey: ["staff"] });

  const statusMutation = useMutation({
    mutationFn: ({ staff, isActive }) => updateStaffStatus(staff.id, isActive),
    onSuccess: (_, { staff, isActive }) => {
      notifySuccess(
        `${staff.full_name} marked as ${isActive ? "active" : "inactive"}`,
      );
      updateStaffInList(staff.id, { is_active: isActive });
      invalidateStaff();
    },
    onError: (err) =>
      notifyError(getApiError(err, "Failed to update staff status")),
  });

  const deleteMutation = useMutation({
    mutationFn: (staff) => deleteStaff(staff.id),
    onSuccess: (_, staff) => {
      notifySuccess(`${staff.full_name} deleted`);
      removeStaffFromList(staff.id);
      invalidateStaff();
    },
    onError: (err) => notifyError(getApiError(err, "Failed to delete staff")),
  });

  // mutateAsync: the dialogs wait for it and stay open if the request fails.
  const {
    mutateAsync: changeStatus,
    isPending: isStatusPending,
    variables: statusVars,
  } = statusMutation;
  const { mutateAsync: removeStaff } = deleteMutation;

  const columns = useMemo(
    () =>
      getStaffColumns({
        // TODO: navigate to the edit screen once that route exists.
        onEdit: (staff) =>
          notifyInfo(`Editing ${staff.full_name} is coming soon`),
        onDelete: (staff) => {
          setStaffToDelete(staff);
          setDeleteOpen(true);
        },
        // Ask for confirmation first; the switch only changes after confirming.
        onToggleStatus: (staff, isActive) => {
          setStatusChange({ staff, isActive });
          setStatusOpen(true);
        },
        isStatusUpdating: (staff) =>
          isStatusPending && statusVars?.staff.id === staff.id,
      }),
    [isStatusPending, statusVars],
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
        fixedRows={7}
        columns={columns}
        data={staff}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Search by name, email or staff ID..."
      />

      <AppAlertDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={`${statusChange?.isActive ? "Activate" : "Deactivate"} ${
          statusChange?.staff.full_name ?? "staff member"
        }?`}
        description={
          statusChange?.isActive
            ? "This staff member will be marked as active."
            : "This staff member will be marked as inactive."
        }
        confirmText={statusChange?.isActive ? "Activate" : "Deactivate"}
        variant={statusChange?.isActive ? "default" : "destructive"}
        isLoading={
          statusChange
            ? isStatusPending && statusVars?.staff.id === statusChange.staff.id
            : false
        }
        onConfirm={() => changeStatus(statusChange)}
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${staffToDelete?.full_name ?? "staff member"}?`}
        description="This removes the staff member from the list. This action cannot be undone from the app."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => removeStaff(staffToDelete)}
      />
    </div>
  );
}

export default StaffList;
