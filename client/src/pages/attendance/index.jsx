import { useRef, useState } from "react";

import Title from "@/components/additonal/Title";
import { checkInMember } from "@/api/attendance/attendanceApi";
import { useAlertStore } from "@/store/alert";

import CheckInPanel from "./CheckInPanel";
import MemberDetailsPanel from "./MemberDetailsPanel";
import { useMemberLookup } from "./useMemberLookup";

function Attendance() {
  const inputRef = useRef(null);
  const addAlert = useAlertStore((state) => state.addAlert);

  const { status, member, memberId, lookup, reset } = useMemberLookup();

  // Newest first. Kept in memory only until the server has an attendance endpoint.
  const [checkIns, setCheckIns] = useState([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const alreadyIn = Boolean(
    member && checkIns.some((entry) => entry.member_id === member.id),
  );

  const handleCheckIn = async () => {
    if (!member || alreadyIn || isCheckingIn) return;

    setIsCheckingIn(true);

    try {
      const attendance = await checkInMember(member.id);

      setCheckIns((current) => [
        {
          id: attendance.id,
          member_id: member.id,
          name: member.member_name,
          member_Id: member.member_Id,
          avatar_url: member.avatar_url,
          checked_in_at: attendance.checked_in_at,
        },
        ...current,
      ]);

      addAlert({
        type: "success",
        title: "Checked in",
        message: `${member.member_name} has been checked in.`,
      });

      reset();
      inputRef.current?.focus();
    } catch {
      addAlert({
        type: "error",
        message: "Could not record the check-in. Please try again.",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      <Title
        title="Attendance"
        description="Record and review member check-ins."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <CheckInPanel
          onLookup={lookup}
          isLoading={status === "loading"}
          checkIns={checkIns}
          inputRef={inputRef}
        />

        <MemberDetailsPanel
          status={status}
          member={member}
          memberId={memberId}
          alreadyIn={alreadyIn}
          isCheckingIn={isCheckingIn}
          onCheckIn={handleCheckIn}
        />
      </div>
    </div>
  );
}

export default Attendance;
