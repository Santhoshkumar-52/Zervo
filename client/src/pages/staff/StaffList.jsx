import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

  const {
    mutate: changeStatus,
    isPending: isStatusPending,
    variables: statusVars,
  } = statusMutation;
  const { mutate: removeStaff } = deleteMutation;

  const columns = useMemo(
    () =>
      getStaffColumns({
        // TODO: navigate to the edit screen once that route exists.
        onEdit: (staff) =>
          notifyInfo(`Editing ${staff.full_name} is coming soon`),
        onDelete: (staff) => {
          if (
            window.confirm(`Delete ${staff.full_name}? This cannot be undone.`)
          ) {
            removeStaff(staff);
          }
        },
        onToggleStatus: (staff, isActive) => changeStatus({ staff, isActive }),
        isStatusUpdating: (staff) =>
          isStatusPending && statusVars?.staff.id === staff.id,
      }),
    [changeStatus, removeStaff, isStatusPending, statusVars],
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
    </div>
  );
}

export default StaffList;
