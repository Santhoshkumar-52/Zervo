/**
 * Seed member attendance (sample check-ins for the dashboard's attendance chart).
 * Table: mem_attendance. Staff check-ins are in 11_staff_attendance.js.
 *
 * Flow: branches -> users -> members (04) -> attendance (this file)
 *
 * Every active member gets check-ins on about two days out of three over the
 * last DAYS_BACK days (each member rests on a different day), so the check-ins
 * split across genders and branches like real life. Everything is deterministic
 * (no random), so every run produces the same shape of data.
 *
 *   - checkinat: between 06:00 and 19:59, never in the future
 *   - checkoutat: 45 to 85 minutes later, empty while that time is still ahead
 *   - system_checkout: 0 (manual checkout) when checked out, otherwise NULL
 *
 * Running this seed again clears mem_attendance first, so it can be re-run on
 * its own:
 *
 *   npx knex seed:run --specific=10_mem_attendance.js
 *
 * Note: members cannot be re-seeded (04_members.js) while mem_attendance has
 * rows, because the rows point at members. Clear this table first.
 *
 * @param {import('knex').Knex} knex
 */

const DAYS_BACK = 40;
const CHUNK_SIZE = 200;

exports.seed = async function (knex) {
  // Active, non-deleted members of every branch.
  const members = await knex("members")
    .where({ is_active: true })
    .whereNull("deleted_at")
    .orderBy("id")
    .select("id", "branch_id");

  if (!members.length) {
    throw new Error("No members found. Run 04_members first.");
  }

  // Who "created" the seeded rows.
  const owner = await knex("users")
    .join("groups", "users.group_id", "groups.id")
    .where("groups.name", "owner")
    .orderBy("users.id")
    .first("users.id");
  const seededBy = owner ? owner.id : null;

  const now = new Date();
  const rows = [];

  members.forEach((member, memberIndex) => {
    // Oldest day first.
    for (let day = DAYS_BACK; day >= 0; day -= 1) {
      // One rest day in three, different for every member.
      if ((day + memberIndex) % 3 === 0) continue;

      const hour = 6 + ((memberIndex * 5 + day * 3) % 14);
      const minute = (memberIndex * 11 + day * 7) % 60;

      const checkIn = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - day,
        hour,
        minute,
      );

      // Today's check-ins are never in the future.
      if (checkIn > now) continue;

      const stayMinutes = 45 + ((memberIndex + day) % 5) * 10;
      const checkOut = new Date(checkIn.getTime() + stayMinutes * 60 * 1000);
      const checkedOut = checkOut <= now;

      rows.push({
        member_id: member.id,
        branch_id: member.branch_id,
        checkinat: checkIn,
        checkoutat: checkedOut ? checkOut : null,
        system_checkout: checkedOut ? 0 : null,
        created_by: seededBy,
        updated_by: seededBy,
        created_at: checkIn,
        updated_at: checkedOut ? checkOut : checkIn,
      });
    }
  });

  await knex("mem_attendance").del();

  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    await knex("mem_attendance").insert(rows.slice(start, start + CHUNK_SIZE));
  }

  console.log(`Seeded ${rows.length} member check-ins`);
};
