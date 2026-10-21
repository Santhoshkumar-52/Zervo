const db = require("../../config/knexfile");

// knex raw expressions have no `.as()`, so the alias is added in the SQL.
// Used as: formatDay("a.checkinat").as("attendance_date")
// `??` quotes the column and the alias as identifiers.
const formatDay = (column) => ({
  as: (alias) => db.raw("DATE_FORMAT(??, '%Y-%m-%d') AS ??", [column, alias]),
});

// One page of the member check-ins whose check-in time falls between startDate
// and endDate (both days included), newest first. Search matches the member's
// member_Id, phone or name. Scoped to the branch; rows with deleted_by set are
// hidden. The member is joined without hiding soft-deleted members, so a
// report still shows who checked in after a member was removed.
// Returns { records, total } where total counts every matching check-in.
const findAttendanceReport = async (
  branchId,
  { startDate, endDate, search, page, limit },
) => {
  const base = db("mem_attendance as a")
    .leftJoin("members as m", function joinMember() {
      this.on("m.id", "=", "a.member_id").andOn(
        "m.branch_id",
        "=",
        "a.branch_id",
      );
    })
    .where("a.branch_id", branchId)
    .whereNull("a.deleted_by")
    .where("a.checkinat", ">=", startDate)
    .whereRaw("a.checkinat < DATE_ADD(?, INTERVAL 1 DAY)", [endDate]);

  if (search) {
    const like = `%${search}%`;

    base.where((query) => {
      query
        .where("m.member_Id", "like", like)
        .orWhere("m.phone", "like", like)
        .orWhereRaw("CONCAT_WS(' ', m.first_name, m.last_name) LIKE ?", [like]);
    });
  }

  const [{ total }] = await base.clone().count("a.id as total");

  const rows = await base
    .clone()
    .select(
      "a.id",
      formatDay("a.checkinat").as("attendance_date"),
      "a.checkinat",
      "a.checkoutat",
      "a.system_checkout",
      // NULL while the member has not checked out yet.
      db.raw("TIMESTAMPDIFF(MINUTE, a.checkinat, a.checkoutat) AS duration_minutes"),
      "a.member_id",
      "m.member_Id as member_code",
      "m.first_name",
      "m.last_name",
      "m.phone",
      "m.avatar_url",
    )
    .orderBy("a.checkinat", "desc")
    .orderBy("a.id", "desc")
    .limit(limit)
    .offset((page - 1) * limit);

  const records = rows.map((row) => ({
    id: row.id,
    attendance_date: row.attendance_date,
    checkin_at: row.checkinat,
    checkout_at: row.checkoutat,
    duration_minutes:
      row.duration_minutes === null ? null : Number(row.duration_minutes),
    // 1 = automatic checkout, 0 = manual checkout, null = not checked out.
    system_checkout:
      row.system_checkout === null ? null : Boolean(row.system_checkout),
    member: {
      id: row.member_id,
      member_id: row.member_code ?? null,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
      phone: row.phone ?? null,
      avatar_url: row.avatar_url ?? null,
    },
  }));

  return { records, total: Number(total) };
};

// One page of the staff check-ins whose check-in time falls between startDate
// and endDate (both days included), newest first. Search matches the staff
// member's user ID, name, email or group name (owner, manager ...). Scoped to
// the branch; rows with deleted_by set are hidden. The staff member is joined
// without hiding soft-deleted users, so a report still shows who checked in
// after an account was removed.
// Returns { records, total } where total counts every matching check-in.
const findStaffAttendanceReport = async (
  branchId,
  { startDate, endDate, search, page, limit },
) => {
  const base = db("staff_attendance as a")
    .leftJoin("users as u", function joinUser() {
      this.on("u.id", "=", "a.user_id").andOn("u.branch_id", "=", "a.branch_id");
    })
    .leftJoin("groups as g", "g.id", "u.group_id")
    .where("a.branch_id", branchId)
    .whereNull("a.deleted_by")
    .where("a.checkinat", ">=", startDate)
    .whereRaw("a.checkinat < DATE_ADD(?, INTERVAL 1 DAY)", [endDate]);

  if (search) {
    const like = `%${search}%`;

    base.where((query) => {
      query
        .where("u.user_id", "like", like)
        .orWhere("u.full_name", "like", like)
        .orWhere("u.email", "like", like)
        .orWhere("g.name", "like", like);
    });
  }

  const [{ total }] = await base.clone().count("a.id as total");

  const rows = await base
    .clone()
    .select(
      "a.id",
      formatDay("a.checkinat").as("attendance_date"),
      "a.checkinat",
      "a.checkoutat",
      "a.system_checkout",
      // NULL while the staff member has not checked out yet.
      db.raw("TIMESTAMPDIFF(MINUTE, a.checkinat, a.checkoutat) AS duration_minutes"),
      "a.user_id as staff_id",
      "u.user_id as staff_code",
      "u.full_name",
      "u.email",
      "u.avatar_url",
      "g.name as group_name",
    )
    .orderBy("a.checkinat", "desc")
    .orderBy("a.id", "desc")
    .limit(limit)
    .offset((page - 1) * limit);

  const records = rows.map((row) => ({
    id: row.id,
    attendance_date: row.attendance_date,
    checkin_at: row.checkinat,
    checkout_at: row.checkoutat,
    duration_minutes:
      row.duration_minutes === null ? null : Number(row.duration_minutes),
    // 1 = automatic checkout, 0 = manual checkout, null = not checked out.
    system_checkout:
      row.system_checkout === null ? null : Boolean(row.system_checkout),
    staff: {
      id: row.staff_id,
      user_id: row.staff_code ?? null,
      name: row.full_name ?? null,
      email: row.email ?? null,
      avatar_url: row.avatar_url ?? null,
      group_name: row.group_name ?? null,
    },
  }));

  return { records, total: Number(total) };
};

module.exports = {
  findAttendanceReport,
  findStaffAttendanceReport,
};
