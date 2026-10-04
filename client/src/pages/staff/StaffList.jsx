import { useEffect, useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { useStaffStore } from "@/store/staff";
import { notifyInfo } from "@/utils/notification";

import { getStaffColumns } from "./StaffColumns";

const SEARCH_DEBOUNCE_MS = 400;

// Rows are keyed by the internal `id`, the same id every staff endpoint uses.
const getRowId = (row) => String(row.id);

/**
 * Staff screen. Everything it shows comes from the staff store, and every
 * change goes through a store action (API call -> store update -> re-render):
 *
 *   list    fetchStaff    (runs when the page or applied search changes)
 *   status  toggleStatus  -> row replaced
 *   delete  deleteStaff   -> row removed
 *
 * The store also has createStaff, fetchStaffById and updateStaff, ready for
 * the add / edit dialogs.
 */
function StaffList() {
  // ---- Rendered from the store ---------------------------------------
  const staff = useStaffStore((state) => state.staff);
  const total = useStaffStore((state) => state.total);
  const search = useStaffStore((state) => state.search);
  const pagination = useStaffStore((state) => state.pagination);
  const appliedSearch = useStaffStore((state) => state.appliedSearch);
  const isLoading = useStaffStore((state) => state.isLoading);
  const isFetching = useStaffStore((state) => state.isFetching);
  const error = useStaffStore((state) => state.error);
  const isDeleting = useStaffStore((state) => state.isDeleting);
  const statusUpdatingIds = useStaffStore((state) => state.statusUpdatingIds);

  // ---- Store actions -------------------------------------------------
  const setSearch = useStaffStore((state) => state.setSearch);
  const applySearch = useStaffStore((state) => state.applySearch);
  const setPagination = useStaffStore((state) => state.setPagination);
  const fetchStaff = useStaffStore((state) => state.fetchStaff);
  const toggleStatus = useStaffStore((state) => state.toggleStatus);
  const deleteStaff = useStaffStore((state) => state.deleteStaff);

  // ---- Dialog UI state (which dialog is open) ------------------------
  // Kept while the dialog animates closed so its text does not flicker.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);

  // { staff, isActive } for the status confirmation dialog.
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusChange, setStatusChange] = useState(null);

  // Apply the typed search to the list once the user stops typing.
  useEffect(() => {
    const timer = setTimeout(
      () => applySearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [search, applySearch]);

  // Load the list whenever the page or the applied search changes.
  useEffect(() => {
    fetchStaff();
  }, [fetchStaff, appliedSearch, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo(
    () =>
      getStaffColumns({
        // TODO: open an edit dialog (selectStaff -> fetchStaffById -> updateStaff).
        onEdit: (member) =>
          notifyInfo(`Editing ${member.full_name} is coming soon`),
        onDelete: (member) => {
          setStaffToDelete(member);
          setDeleteOpen(true);
        },
        // Ask for confirmation first; the switch only changes after confirming.
        onToggleStatus: (member, isActive) => {
          setStatusChange({ staff: member, isActive });
          setStatusOpen(true);
        },
        isStatusUpdating: (member) => statusUpdatingIds.includes(member.id),
      }),
    [statusUpdatingIds],
  );

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
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
            ? statusUpdatingIds.includes(statusChange.staff.id)
            : false
        }
        onConfirm={() => toggleStatus(statusChange.staff, statusChange.isActive)}
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${staffToDelete?.full_name ?? "staff member"}?`}
        description="This removes the staff member from the list. This action cannot be undone from the app."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deleteStaff(staffToDelete)}
      />
    </div>
  );
}

export default StaffList;
