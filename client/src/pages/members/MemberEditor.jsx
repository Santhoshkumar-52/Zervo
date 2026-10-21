import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useMemberStore } from "@/store/member";

import EditMemberDialog from "./EditMemberDialog";

// Screens that show member data and should pick up an edit right away.
const REFRESH_KEYS = [
  ["member-profile"], // ProfileViewer and the selected-member card
  ["subscription-members"], // member dropdown on the subscription form
  ["subscription-report"],
  ["attendance-report"],
];

/**
 * EditMemberDialog for screens that only know a member id (for example the
 * "Edit" button of ProfileViewer). It loads the member by id through the
 * member store, saves through `updateMember`, then refreshes the screens that
 * show member data.
 *
 * The members page does not need this: it already owns its edit dialog.
 *
 *   <MemberEditor
 *     open={editOpen}
 *     onOpenChange={setEditOpen}   // pass a stable setter (useState's)
 *     memberId={member.id}         // members.id (internal id), not member_Id
 *     onSaved={(member) => ...}    // optional, gets the updated member
 *   />
 */
function MemberEditor({ open, onOpenChange, memberId, onSaved }) {
  const queryClient = useQueryClient();

  const selectedMember = useMemberStore((state) => state.selectedMember);
  const isSelectedLoading = useMemberStore((state) => state.isSelectedLoading);
  const isSaving = useMemberStore((state) => state.isSaving);
  const selectMember = useMemberStore((state) => state.selectMember);
  const clearSelectedMember = useMemberStore(
    (state) => state.clearSelectedMember,
  );
  const fetchMemberById = useMemberStore((state) => state.fetchMemberById);
  const updateMember = useMemberStore((state) => state.updateMember);

  // Each time the dialog opens: show what ProfileViewer already loaded (same
  // endpoint, same shape) so the form is not empty, then refresh it by id.
  useEffect(() => {
    if (!open || !memberId) return;

    const cached = queryClient.getQueryData(["member-profile", memberId])
      ?.member;

    if (cached) selectMember(cached);
    else clearSelectedMember();

    // The store shows the error; close because there is nothing to edit.
    fetchMemberById(memberId).catch(() => onOpenChange(false));
  }, [
    open,
    memberId,
    queryClient,
    selectMember,
    clearSelectedMember,
    fetchMemberById,
    onOpenChange,
  ]);

  // Never show another member's data while this one loads.
  const member = selectedMember?.id === memberId ? selectedMember : null;

  const handleSubmit = async (values, current) => {
    // Throws on failure, so the dialog stays open.
    const updated = await updateMember(current.id, values);

    REFRESH_KEYS.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    );

    onSaved?.(updated);
  };

  return (
    <EditMemberDialog
      open={open}
      onOpenChange={onOpenChange}
      member={member}
      isMemberLoading={isSelectedLoading || !member}
      isLoading={isSaving}
      onSubmit={handleSubmit}
    />
  );
}

export default MemberEditor;
