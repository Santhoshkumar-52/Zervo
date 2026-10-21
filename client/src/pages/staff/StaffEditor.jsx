import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useStaffStore } from "@/store/staff";

import EditStaffDialog from "./EditStaffDialog";

// Screens that show staff data and should pick up an edit right away.
const REFRESH_KEYS = [
  ["staff-profile"], // StaffProfileViewer
  ["staff-attendance-report"],
  ["member-profile"], // shows the member's trainer name
  ["member-trainers"], // trainer dropdown on the member form
];

/**
 * EditStaffDialog for screens that only know a staff id (for example the
 * "Edit" button of StaffProfileViewer). It loads the staff member by id
 * through the staff store, saves through `updateStaff`, then refreshes the
 * screens that show staff data.
 *
 * The staff page does not need this: it already owns its edit dialog.
 *
 *   <StaffEditor
 *     open={editOpen}
 *     onOpenChange={setEditOpen}   // pass a stable setter (useState's)
 *     staffId={staff.id}           // users.id (internal id), not user_id
 *     onSaved={(staff) => ...}     // optional, gets the updated staff member
 *   />
 */
function StaffEditor({ open, onOpenChange, staffId, onSaved }) {
  const queryClient = useQueryClient();

  const selectedStaff = useStaffStore((state) => state.selectedStaff);
  const isSelectedLoading = useStaffStore((state) => state.isSelectedLoading);
  const isSaving = useStaffStore((state) => state.isSaving);
  const selectStaff = useStaffStore((state) => state.selectStaff);
  const clearSelectedStaff = useStaffStore(
    (state) => state.clearSelectedStaff,
  );
  const fetchStaffById = useStaffStore((state) => state.fetchStaffById);
  const updateStaff = useStaffStore((state) => state.updateStaff);

  // Each time the dialog opens: show what StaffProfileViewer already loaded
  // (same endpoint, same shape) so the form is not empty, then refresh it.
  useEffect(() => {
    if (!open || !staffId) return;

    const cached = queryClient.getQueryData(["staff-profile", staffId]);

    if (cached) selectStaff(cached);
    else clearSelectedStaff();

    // The store shows the error; close because there is nothing to edit.
    fetchStaffById(staffId).catch(() => onOpenChange(false));
  }, [
    open,
    staffId,
    queryClient,
    selectStaff,
    clearSelectedStaff,
    fetchStaffById,
    onOpenChange,
  ]);

  // Never show another staff member's data while this one loads.
  const staff = selectedStaff?.id === staffId ? selectedStaff : null;

  const handleSubmit = async (values, current) => {
    // Throws on failure, so the dialog stays open.
    const updated = await updateStaff(current.id, values);

    REFRESH_KEYS.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    );

    onSaved?.(updated);
  };

  return (
    <EditStaffDialog
      open={open}
      onOpenChange={onOpenChange}
      staff={staff}
      isStaffLoading={isSelectedLoading || !staff}
      isLoading={isSaving}
      onSubmit={handleSubmit}
    />
  );
}

export default StaffEditor;
