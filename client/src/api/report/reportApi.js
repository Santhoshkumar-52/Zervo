import api from "../axios";

// GET /api/report/attendance
// params: { start_date, end_date, page, limit, search }
//   start_date, end_date  YYYY-MM-DD, both days included (required)
//   page (default 1), limit (default 10, max 100), search (member ID, phone
//   or name)
// The server accepts the dates in the query string, since a browser cannot
// send a body on GET. Only roles 1, 2 and 3 may call it (403 otherwise).
// Response: { success, message, data: { records, pagination } }
//   records:    [{ id, attendance_date, checkin_at, checkout_at,
//                  duration_minutes (null until checked out),
//                  system_checkout (true = automatic, false = manual,
//                                   null = not checked out),
//                  member: { id, member_id, name, phone } }]
//   pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
export const getAttendanceReport = (params = {}) => {
  // Drop empty values so we never send ?search=
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api
    .get("/report/attendance", { params: cleanParams })
    .then((res) => res.data.data);
};

// GET /api/report/staff-attendance
// params: { start_date, end_date, page, limit, search }
//   Same as getAttendanceReport; search matches the staff user ID, name, email
//   or group name.
// Response: { success, message, data: { records, pagination } }
//   records:    [{ id, attendance_date, checkin_at, checkout_at,
//                  duration_minutes (null until checked out),
//                  system_checkout (true = automatic, false = manual,
//                                   null = not checked out),
//                  staff: { id, user_id, name, email, group_name } }]
//   pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
export const getStaffAttendanceReport = (params = {}) => {
  // Drop empty values so we never send ?search=
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api
    .get("/report/staff-attendance", { params: cleanParams })
    .then((res) => res.data.data);
};