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

  // The server explains why a check-in was refused (no active plan, plan
  // expired, member inactive, ...) in response.data.message. Axios only puts a
  // generic "Request failed with status code 403" in error.message, so read the
  // server message first.
  // const getErrorMessage = (err) => {
  //   const data = err?.response?.data;

  //   // Zod validation failures: { message: "Validation failed", errors: ... }
  //   const details = Array.isArray(data?.errors)
  //     ? data.errors
  //         .map((item) => (typeof item === "string" ? item : item?.message))
  //         .filter(Boolean)
  //         .join(", ")
  //     : "";

  //   if (data?.message) {
  //     return details ? `${data.message}: ${details}` : data.message;
  //   }

  //   // No response at all: server down or no network.
  //   if (err?.request && !err?.response) {
  //     return "Cannot reach the server. Check your connection and try again.";
  //   }

  //   return "Could not record the check-in. Please try again.";
  // };

  const handleCheckIn = async () => {
    if (!member || alreadyIn || isCheckingIn) return;

    setIsCheckingIn(true);

    try {
      // Server expects the member's own ID (members.member_Id), not the row id.
      const response = await checkInMember(member.member_Id);

      // Response shape: { success, message, data: { attendance, member, plan } }
      const { attendance, plan } = response.data.data;

      setCheckIns((current) => [
        {
          id: attendance.id,
          member_id: member.id,
          name: member.member_name,
          member_Id: member.member_Id,
          avatar_url: member.avatar_url,
          checked_in_at: attendance.checkin_at,
        },
        ...current,
      ]);

      addAlert({
        type: "success",
        title: "Checked in",
        message: `${member.member_name} has been checked in.`,
      });

      // Plan is close to ending: tell the front desk separately.
      if (plan?.expiring_soon && plan?.message) {
        addAlert({
          type: "warning",
          title: "Plan expiring",
          message: `${member.member_name}: ${plan.message}.`,
          duration: 6000,
        });
      }

      reset();
      inputRef.current?.focus();
    } catch (err) {
      console.log(err.response);
      
      addAlert({
        type: "error",
        title: "Check-in failed",
        message: err.response.data.message,
        duration: 6000,
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
