import api from "../axios";

// POST /api/member/attendance/check-in
// body: { member_id }   member_id is the member's own ID (members.member_Id),
//                       the number typed on the Attendance screen.
// The branch comes from the logged-in user, never from the client.
//
// Success (201): { success, message, data: { attendance, member, plan } }
//   attendance: { id, checkin_at }
//   member:     { id, member_id, name, phone, email, avatar_url, branch_name, trainer_name }
//   plan:       { subscription_no, plan_names, start_date, end_date,
//                 days_left, expiring_soon, message }
// Failure (400 / 403 / 404): { success: false, message, errors }
//   message says why: member not found, inactive, no plan, plan expired.
export const checkInMember = (memberId) =>
  api.post("/member/attendance/check-in", { member_id: memberId });
