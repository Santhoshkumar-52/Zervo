// STUB: the server has no attendance endpoint yet, so nothing is saved.
// The Attendance screen keeps the check-ins it records in memory only.
//
// To go live, replace the body with:
//   api
//     .post("/attendance/check-in", { member_id: memberId })
//     .then((res) => res.data.data.attendance)
// and add `import api from "../axios";` at the top.
//
// `memberId` is the member's internal `id` (not `member_Id`), like every
// other member endpoint.
// Response: { data: { attendance: { id, member_id, checked_in_at } } }
export const checkInMember = async (memberId) => ({
  id: `${memberId}-${Date.now()}`,
  member_id: memberId,
  checked_in_at: new Date().toISOString(),
});
