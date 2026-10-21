/**
 * Seed staff attendance (sample check-ins for the staff_attendance table).
 *
 * Flow: branches -> groups -> users (03) -> attendance (this file)
 *
 * Every active, non-deleted user (owner, managers, front desk, trainers) gets a
 * check-in on each working day over the last DAYS_BACK days. Each user has one
 * weekly off day (picked by their position in the list, so the off days are
 * spread over the week). Everything is deterministic (no random), so every run
 * produces the same shape of data.
 *
 *   - checkinat: a morning shift start, between 05:30 and 09:59, never in the
 *     future
 *   - checkoutat: 8 to 9 hours later, empty while that time is still ahead
 *   - system_checkout: 1 (automatic checkout) for some, 0 (manual checkout) for
 *     the rest, NULL while the user is still checked in
 *
 * Running this seed again clears staff_attendance first, so it can be re-run on
 * its own:
 *
 *   npx knex seed:run --specific=11_staff_attendance.js
 *
 * Note: users cannot be re-seeded (03_users.js) while staff_attendance has
 * rows, because the rows point at users. Clear this table first.
 *
 * @param {import('knex').Knex} knex
 */

const DAYS_BACK = 40;
const CHUNK_SIZE = 200;

exports.seed = async function (knex) {
  // Active, non-deleted users of every branch.
  const users = await knex("users")
    .where({ is_active: true })
    .whereNull("deleted_at")
    .orderBy("id")
    .select("id", "branch_id");

  if (!users.length) {
    throw new Error("No users found. Run 03_users first.");
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

  users.forEach((user, userIndex) => {
    // Oldest day first.
    for (let day = DAYS_BACK; day >= 0; day -= 1) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - day,
      );

      // One weekly off day (0 = Sunday ... 6 = Saturday), different per user.
      if (date.getDay() === userIndex % 7) continue;

      // Shift start 05:30 - 09:59.
      const startMinutes = 5 * 60 + 30 + ((userIndex * 17 + day * 11) % 270);

      const checkIn = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Math.floor(startMinutes / 60),
        startMinutes % 60,
      );

      // Today's check-ins are never in the future.
      if (checkIn > now) continue;

      // 8 to 9 hours on shift.
      const shiftMinutes = 8 * 60 + ((userIndex + day) % 4) * 20;
      const checkOut = new Date(checkIn.getTime() + shiftMinutes * 60 * 1000);
      const checkedOut = checkOut <= now;

      rows.push({
        user_id: user.id,
        branch_id: user.branch_id,
        checkinat: checkIn,
        checkoutat: checkedOut ? checkOut : null,
        // Every 5th checkout is automatic (forgot to check out), the rest manual.
        system_checkout: checkedOut ? ((userIndex + day) % 5 === 0 ? 1 : 0) : null,
        created_by: seededBy,
        updated_by: seededBy,
        created_at: checkIn,
        updated_at: checkedOut ? checkOut : checkIn,
      });
    }
  });

  await knex("staff_attendance").del();

  for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
    await knex("staff_attendance").insert(rows.slice(start, start + CHUNK_SIZE));
  }

  console.log(`Seeded ${rows.length} staff check-ins`);
};
