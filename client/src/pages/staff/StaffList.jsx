import { useEffect, useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { useStaffStore } from "@/store/staff";

import EditStaffDialog from "./EditStaffDialog";
import { getStaffColumns } from "./StaffColumns";

const SEARCH_DEBOUNCE_MS = 400;

// Rows are keyed by the internal `id`, the same id every staff endpoint uses.
const getRowId = (row) => String(row.id);

/**
 * Staff screen. Everything it shows comes from the staff store, and every
 * change goes through a store action (API call -> store update -> re-render):
 *
 *   list    fetchStaff    (runs when the page or applied search changes)
 *   add     createStaff   -> row added to the table (dialog is in index.jsx)
 *   edit    fetchStaffById, updateStaff -> row replaced
 *   status  toggleStatus  -> row replaced
 *   delete  deleteStaff   -> row removed
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
  const selectedStaff = useStaffStore((state) => state.selectedStaff);
  const isSelectedLoading = useStaffStore((state) => state.isSelectedLoading);
  const isSaving = useStaffStore((state) => state.isSaving);
  const isDeleting = useStaffStore((state) => state.isDeleting);
  const statusUpdatingIds = useStaffStore((state) => state.statusUpdatingIds);

  // ---- Store actions -------------------------------------------------
  const setSearch = useStaffStore((state) => state.setSearch);
  const applySearch = useStaffStore((state) => state.applySearch);
  const setPagination = useStaffStore((state) => state.setPagination);
  const fetchStaff = useStaffStore((state) => state.fetchStaff);
  const selectStaff = useStaffStore((state) => state.selectStaff);
  const fetchStaffById = useStaffStore((state) => state.fetchStaffById);
  const updateStaff = useStaffStore((state) => state.updateStaff);
  const toggleStatus = useStaffStore((state) => state.toggleStatus);
  const deleteStaff = useStaffStore((state) => state.deleteStaff);

  // ---- Dialog UI state (which dialog is open) ------------------------
  // The edited staff member itself lives in the store (`selectedStaff`); it
  // stays after the dialog closes so its content does not flicker.
  const [editOpen, setEditOpen] = useState(false);

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
        onEdit: (member) => {
          // Show the row's data straight away, then refresh it by id.
          selectStaff(member);
          setEditOpen(true);
          fetchStaffById(member.id).catch(() => setEditOpen(false));
        },
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
    [selectStaff, fetchStaffById, statusUpdatingIds],
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

      {/* Edit. The dialog closes only when updateStaff resolves. */}
      <EditStaffDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        staff={selectedStaff}
        isStaffLoading={isSelectedLoading}
        isLoading={isSaving}
        onSubmit={(values, member) => updateStaff(member.id, values)}
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
