import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, SearchX } from "lucide-react";

import AppAlertDialog from "@/components/additonal/AlertDialog";
import DataTable from "@/components/additonal/Datatable/DataTable";
import ProfileViewer from "@/components/additonal/ProfileViewer";
import StaffProfileViewer from "@/components/additonal/StaffProfileViewer";
import StaffEditor from "@/pages/staff/StaffEditor";
import { useMemberStore } from "@/store/member";

import EditMemberDialog from "./EditMemberDialog";
import { getMembersColumns } from "./MembersColumns";

// Shown when the list is empty: nothing exists yet, or the search found nothing.
const EMPTY_STATE = {
  icon: Users,
  title: "No members yet",
  description: "Members you add will show up here.",
};

const getNoMatchState = (term) => ({
  icon: SearchX,
  title: "No members found",
  description: `Nothing matches "${term}". Try a different name, email, phone or trainer.`,
});

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
 *   profile ProfileViewer     (opened from the name; fetches by id itself)
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

  // Member whose profile modal is open (opened by clicking a name).
  const [profileOpen, setProfileOpen] = useState(false);

  // Trainer whose profile modal is open (opened by clicking a trainer name).
  const [trainerId, setTrainerId] = useState(null);
  const [trainerOpen, setTrainerOpen] = useState(false);
  const [trainerEditOpen, setTrainerEditOpen] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState(null);

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

  const handleEdit = useCallback(
    (member) => {
      // Show the row's data straight away, then refresh it by id.
      selectMember(member);
      setEditOpen(true);
      fetchMemberById(member.id).catch(() => setEditOpen(false));
    },
    [selectMember, fetchMemberById],
  );

  const columns = useMemo(
    () =>
      getMembersColumns({
        onEdit: handleEdit,
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
        onViewTrainer: (staffId) => {
          setTrainerId(staffId);
          setTrainerOpen(true);
        },
        onViewProfile: (memberId) => {
          setProfileMemberId(memberId);
          setProfileOpen(true);
        },
      }),
    [handleEdit, statusUpdatingIds],
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
        data={members}
        getRowId={getRowId}
        rowCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={search}
        onGlobalFilterChange={setSearch}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyState={appliedSearch ? getNoMatchState(appliedSearch) : EMPTY_STATE}
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

      {/* Read-only profile. Loads the member + subscription by id on open. */}
      <ProfileViewer
        open={profileOpen}
        onOpenChange={setProfileOpen}
        memberId={profileMemberId}
        onEdit={(memberId) => {
          // The profile was opened from a row, so the row is in the list.
          const member = members.find((item) => item.id === memberId);

          if (member) handleEdit(member);
        }}
      />

      {/* Trainer profile. Edit opens the staff edit dialog; a saved change
          (for example a new name) is pulled into the table by a refetch. */}
      <StaffProfileViewer
        open={trainerOpen}
        onOpenChange={setTrainerOpen}
        staffId={trainerId}
        onEdit={() => setTrainerEditOpen(true)}
      />

      <StaffEditor
        open={trainerEditOpen}
        onOpenChange={setTrainerEditOpen}
        staffId={trainerId}
        onSaved={fetchMembers}
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
          statusChange
            ? statusUpdatingIds.includes(statusChange.member.id)
            : false
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
