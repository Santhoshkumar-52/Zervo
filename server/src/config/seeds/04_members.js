// Placeholder avatars (initials), same style as the users seed.
const avatarUrl = (name) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

// 20 sample members spread over both branches with a mix of states:
//   branch:  MAIN (11) / ANNA-NAGAR (9)
//   status:  active (14) / inactive (6)
//   trainer: assigned / unassigned (assigned only where a branch trainer exists)
//   email, date of birth and avatar: present for some, missing for others
//   joined:  spread from mid-2025 to this month
//
// Columns: [first, last, branch, phone, email, joined_on, dob, trainer, active, avatar]
const SAMPLE_MEMBERS = [
  ["Arun", "Kumar", "MAIN", "9876543210", "arun.kumar@example.com", "2025-06-12", "1992-03-14", false, true, true],
  ["Priya", "Sharma", "MAIN", "9876543211", "priya.sharma@example.com", "2025-07-03", "1995-11-02", false, true, true],
  ["Rahul", "Menon", "MAIN", "9876543212", null, "2025-07-21", "1989-08-27", false, true, false],
  ["Divya", "Nair", "MAIN", "9876543213", "divya.nair@example.com", "2025-08-09", null, false, false, true],
  ["Karthik", "Raja", "MAIN", "9876543214", "karthik.raja@example.com", "2025-09-15", "1998-01-19", false, true, false],
  ["Meena", "Iyer", "MAIN", "9876543215", null, "2025-10-30", "1987-05-06", false, true, true],
  ["Suresh", "Babu", "MAIN", "9876543216", "suresh.babu@example.com", "2025-12-04", "1983-12-22", false, false, false],
  ["Lakshmi", "Narayanan", "MAIN", "9876543217", "lakshmi.n@example.com", "2026-01-18", "1991-09-09", false, true, true],
  ["Vignesh", "Pillai", "MAIN", "9876543218", null, "2026-03-02", null, false, true, false],
  ["Anitha", "Selvam", "MAIN", "9876543219", "anitha.selvam@example.com", "2026-06-25", "1996-04-30", false, false, true],
  ["Mohan", "Das", "MAIN", "9876543220", "mohan.das@example.com", "2026-09-28", "2000-07-15", false, true, false],

  ["Sneha", "Reddy", "ANNA-NAGAR", "9876543221", "sneha.reddy@example.com", "2025-06-30", "1994-02-11", true, true, true],
  ["Vikram", "Patel", "ANNA-NAGAR", "9876543222", "vikram.patel@example.com", "2025-08-22", "1990-10-05", true, true, false],
  ["Deepa", "Krishnan", "ANNA-NAGAR", "9876543223", null, "2025-09-27", "1985-06-18", false, false, true],
  ["Arjun", "Venkat", "ANNA-NAGAR", "9876543224", "arjun.venkat@example.com", "2025-11-11", null, true, true, false],
  ["Nisha", "Joseph", "ANNA-NAGAR", "9876543225", "nisha.joseph@example.com", "2026-02-14", "1997-12-01", true, true, true],
  ["Ganesh", "Murthy", "ANNA-NAGAR", "9876543226", null, "2026-04-08", "1982-03-25", false, false, false],
  ["Harini", "Subramanian", "ANNA-NAGAR", "9876543227", "harini.s@example.com", "2026-07-19", "1999-08-13", true, true, true],
  ["Imran", "Khan", "ANNA-NAGAR", "9876543228", "imran.khan@example.com", "2026-08-30", "1993-11-28", false, false, false],
  ["Janani", "Rao", "ANNA-NAGAR", "9876543229", "janani.rao@example.com", "2026-10-02", "2001-05-21", true, true, true],
];

export async function seed(knex) {
  // Avoid duplicate seed records.
  await knex("members").del();

  // Look up ids (auto-increment ids are not guaranteed to start at 1 on re-runs).
  const branches = await knex("branches").select("id", "code");
  const branchId = Object.fromEntries(branches.map((b) => [b.code, b.id]));

  // Trainers belong to a branch, and a member's trainer must be in the same one.
  // Role now lives in groups: users.group_id -> groups.name.
  // Only active, non-deleted trainers can be assigned (same rule as the API).
  const trainers = await knex("users")
    .join("groups", "users.group_id", "groups.id")
    .where("groups.name", "trainer")
    .where("users.is_active", true)
    .whereNull("users.deleted_at")
    .orderBy("users.id")
    .select("users.id", "users.branch_id");
  const trainerByBranch = {};
  for (const t of trainers) {
    // keep the first trainer found for each branch
    trainerByBranch[t.branch_id] ??= t.id;
  }

  // Who "created" the seeded rows (members.created_by / updated_by are NOT NULL).
  const owner = await knex("users")
    .join("groups", "users.group_id", "groups.id")
    .where("groups.name", "owner")
    .orderBy("users.id")
    .first("users.id");
  const seededBy = owner ? owner.id : 1;

  const rows = SAMPLE_MEMBERS.map(
    (
      [first, last, branch, phone, email, joinedOn, dob, withTrainer, active, withAvatar],
      index,
    ) => ({
      member_Id: index + 1,
      branch_id: branchId[branch],
      first_name: first,
      last_name: last,
      phone,
      email,
      joined_on: joinedOn,
      dob,
      assigned_trainer_id: withTrainer
        ? (trainerByBranch[branchId[branch]] ?? null)
        : null,
      is_active: active,
      avatar_url: withAvatar ? avatarUrl(`${first} ${last}`) : null,
      created_by: seededBy,
      updated_by: seededBy,
      deleted_at: null,
    }),
  );

  await knex("members").insert(rows);
}
