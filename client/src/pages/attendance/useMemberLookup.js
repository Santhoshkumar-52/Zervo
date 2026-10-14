import { useCallback, useRef, useState } from "react";

import { getMembers } from "@/api/member/memberApi";

const INITIAL = { status: "idle", member: null, memberId: "" };

/**
 * Looks one member up by their member ID (members.member_Id).
 *
 *   status: "idle" | "loading" | "found" | "not-found" | "error"
 *
 * Only the latest lookup counts: if the user submits again before the first
 * request returns, the older response is ignored.
 */
export function useMemberLookup() {
  const [state, setState] = useState(INITIAL);
  const latestRequest = useRef(0);

  const lookup = useCallback(async (memberId) => {
    const requestId = ++latestRequest.current;

    setState({ status: "loading", member: null, memberId });

    try {
      const response = await getMembers({ memberId, limit: 1 });

      if (requestId !== latestRequest.current) return;

      const [member] = response.data.data.members;

      setState({
        status: member ? "found" : "not-found",
        member: member ?? null,
        memberId,
      });
    } catch {
      if (requestId !== latestRequest.current) return;

      setState({ status: "error", member: null, memberId });
    }
  }, []);

  const reset = useCallback(() => {
    latestRequest.current += 1;
    setState(INITIAL);
  }, []);

  return { ...state, lookup, reset };
}
