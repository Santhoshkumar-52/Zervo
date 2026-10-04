import { useEffect, useMemo, useState } from "react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import { useMemberStore } from "@/store/member";

import EditMemberDialog from "./EditMemberDialog";
import { getMembersColumns } from "./MembersColumns";

const SEARCH_DEBOUNCE_MS = 400;

// Rows are keyed by the internal `id`, the same id every member endpoint uses.
const getRowId = (row) => String(row.id);

/**
 * Members screen. Everything it shows comes from the member store, and every
 * change goes through a store action (API call -> store update -> re-render):
 *
 *   list    fetchMembers      (runs when the page or applied search changes)
 *   add     createMember      -> row added to the table (dialog is in index.jsx)
 *   edit    fetchMemberById, updateMember -> row replaced
 *   status  toggleStatus      -> row replaced
 *   delete  deleteMember      -> row removed
 */
function MembersList() {
  // ---- Rendered from the store ---------------------------------------
  const members = useMemberStore((state) => state.members);
  const total = useMemberStore((state) => state.total);
  const search = useMemberStore((state) => state.search);
  const pagination = useMemberStore((state) => state.pagination);
  const appliedSearch = useMemberStore((state) => state.appliedSearch);
  const isLoading = useMemberStore((state) => state.isLoading);
  const isFetching = useMemberStore((state) => state.isFetching);
  const error = useMemberStore((state) => state.error);
  const selectedMember = useMemberStore((state) => state.selectedMember);
  const isSelectedLoading = useMemberStore((state) => state.isSelectedLoading);
  const isSaving = useMemberStore((state) => state.isSaving);
  const isDeleting = useMemberStore((state) => state.isDeleting);
  const statusUpdatingIds = useMemberStore((state) => state.statusUpdatingIds);

  // ---- Store actions -------------------------------------------------
  const setSearch = useMemberStore((state) => state.setSearch);
  const applySearch = useMemberStore((state) => state.applySearch);
  const setPagination = useMemberStore((state) => state.setPagination);
  const fetchMembers = useMemberStore((state) => state.fetchMembers);
  const selectMember = useMemberStore((state) => state.selectMember);
  const fetchMemberById = useMemberStore((state) => state.fetchMemberById);
  const updateMember = useMemberStore((state) => state.updateMember);
  const toggleStatus = useMemberStore((state) => state.toggleStatus);
  const deleteMember = useMemberStore((state) => state.deleteMember);

  // ---- Dialog UI state (which dialog is open) ------------------------
  // The edited member itself lives in the store (`selectedMember`); it stays
  // after the dialog closes so its content does not flicker.
  const [editOpen, setEditOpen] = useState(false);

  // Kept while the dialog animates closed so its text does not flicker.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // { member, isActive } for the status confirmation dialog.
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
    fetchMembers();
  }, [fetchMembers, appliedSearch, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo(
    () =>
      getMembersColumns({
        onEdit: (member) => {
          // Show the row's data straight away, then refresh it by id.
          selectMember(member);
          setEditOpen(true);
          fetchMemberById(member.id).catch(() => setEditOpen(false));
        },
        onDelete: (member) => {
          setMemberToDelete(member);
          setDeleteOpen(true);
        },
        // Ask for confirmation first; the switch only changes after confirming.
        onToggleStatus: (member, isActive) => {
          setStatusChange({ member, isActive });
          setStatusOpen(true);
        },
        isStatusUpdating: (member) => statusUpdatingIds.includes(member.id),
      }),
    [selectMember, fetchMemberById, statusUpdatingIds],
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
        columns={columns}
        data={members}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        searchPlaceholder="Search by name, email, phone or trainer..."
      />

      {/* Edit. The dialog closes only when updateMember resolves. */}
      <EditMemberDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        member={selectedMember}
        isMemberLoading={isSelectedLoading}
        isLoading={isSaving}
        onSubmit={(values, member) => updateMember(member.id, values)}
      />

      <AppAlertDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={`${statusChange?.isActive ? "Activate" : "Deactivate"} ${
          statusChange?.member.member_name ?? "member"
        }?`}
        description={
          statusChange?.isActive
            ? "This member will be marked as active."
            : "This member will be marked as inactive."
        }
        confirmText={statusChange?.isActive ? "Activate" : "Deactivate"}
        variant={statusChange?.isActive ? "default" : "destructive"}
        isLoading={
          statusChange ? statusUpdatingIds.includes(statusChange.member.id) : false
        }
        onConfirm={() =>
          toggleStatus(statusChange.member, statusChange.isActive)
        }
      />

      <AppAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${memberToDelete?.member_name ?? "member"}?`}
        description="This removes the member from the list. This action cannot be undone from the app."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deleteMember(memberToDelete)}
      />
    </div>
  );
}

export default MembersList;
