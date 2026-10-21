const { hashPassword } = require("../../utils/hashhelper");

// Placeholder avatars
const avatarUrl = (name) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

// -----------------------------------------------------------------------------
// Demo users
// role is used only to look up groups.id
// -----------------------------------------------------------------------------

const DEMO_USERS = [
  ["owner-001", "Gym Owner", "owner@gym.com", "owner123", "owner", "MAIN"],
  [
    "manager-001",
    "Gym Manager",
    "manager@gym.com",
    "manager123",
    "manager",
    "MAIN",
  ],
  [
    "frontdesk-001",
    "Front Desk",
    "frontdesk@gym.com",
    "frontdesk123",
    "front_desk",
    "ANNA-NAGAR",
  ],
  [
    "trainer-001",
    "Gym Trainer",
    "trainer@gym.com",
    "trainer123",
    "trainer",
    "ANNA-NAGAR",
  ],
];

// -----------------------------------------------------------------------------
// Sample staff
// role is used only to look up groups.id
// -----------------------------------------------------------------------------

const SAMPLE_STAFF = [
  // ---------------------------------------------------------------------------
  // MAIN
  // ---------------------------------------------------------------------------

  ["Ramesh Iyer", "manager", "MAIN", true],
  ["Sangeetha Rao", "manager", "MAIN", false],

  ["Kavya Raman", "front_desk", "MAIN", true],
  ["Pooja Menon", "front_desk", "MAIN", true],
  ["Naveen Kumar", "front_desk", "MAIN", false],
  ["Tamilselvi Arjun", "front_desk", "MAIN", true],
  ["Janaki Ammal", "front_desk", "MAIN", true],

  ["Aravind Swamy", "trainer", "MAIN", true],
  ["Bala Murugan", "trainer", "MAIN", true],
  ["Chitra Devi", "trainer", "MAIN", true],
  ["Dinesh Kannan", "trainer", "MAIN", false],
  ["Elango Sundaram", "trainer", "MAIN", true],
  ["Farhana Begum", "trainer", "MAIN", true],
  ["Gokul Raj", "trainer", "MAIN", false],
  ["Hema Latha", "trainer", "MAIN", true],
  ["Ilango Ramesh", "trainer", "MAIN", true],
  ["Karthikeyan Pillai", "trainer", "MAIN", true],
  ["Latha Mahesh", "trainer", "MAIN", true],

  // ---------------------------------------------------------------------------
  // ANNA-NAGAR
  // ---------------------------------------------------------------------------

  ["Suresh Venkatesh", "manager", "ANNA-NAGAR", true],
  ["Meera Krishnan", "manager", "ANNA-NAGAR", true],

  ["Lavanya Prakash", "front_desk", "ANNA-NAGAR", true],
  ["Mythili Sekar", "front_desk", "ANNA-NAGAR", true],
  ["Naresh Babu", "front_desk", "ANNA-NAGAR", false],
  ["Oviya Sathish", "front_desk", "ANNA-NAGAR", true],

  ["Prakash Raj", "trainer", "ANNA-NAGAR", true],
  ["Revathi Gopal", "trainer", "ANNA-NAGAR", true],
  ["Sathish Kumar", "trainer", "ANNA-NAGAR", true],
  ["Thilaga Rani", "trainer", "ANNA-NAGAR", false],
  ["Udhay Kumar", "trainer", "ANNA-NAGAR", true],
  ["Vasanth Ravi", "trainer", "ANNA-NAGAR", true],
  ["Yamini Devi", "trainer", "ANNA-NAGAR", false],
  ["Zaheer Ahmed", "trainer", "ANNA-NAGAR", true],
  ["Abinaya Selvaraj", "trainer", "ANNA-NAGAR", true],
  ["Bharath Chandran", "trainer", "ANNA-NAGAR", true],
  ["Charulatha Nair", "trainer", "ANNA-NAGAR", true],
  ["Deepak Vijay", "trainer", "ANNA-NAGAR", true],
];

// -----------------------------------------------------------------------------
// User ID prefixes
// -----------------------------------------------------------------------------

const ID_PREFIX = {
  owner: "owner",
  manager: "manager",
  front_desk: "frontdesk",
  trainer: "trainer",
};

// -----------------------------------------------------------------------------
// Generate email from staff name
// -----------------------------------------------------------------------------

const emailFor = (name) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, ".")}@gym.com`;

// -----------------------------------------------------------------------------
// Seed
// -----------------------------------------------------------------------------

exports.seed = async function (knex) {
  // Clear existing users first
  await knex("users").del();

  // ---------------------------------------------------------------------------
  // Get branches dynamically
  // Same pattern as your existing branch seed
  // ---------------------------------------------------------------------------

  const branches = await knex("branches").select("id", "code");

  const branchId = Object.fromEntries(
    branches.map((branch) => [branch.code, branch.id]),
  );

  // ---------------------------------------------------------------------------
  // Get groups dynamically
  //
  // Example:
  // {
  //   owner: 1,
  //   manager: 2,
  //   front_desk: 3,
  //   trainer: 4
  // }
  //
  // The actual IDs come from the database.
  // ---------------------------------------------------------------------------

  const groups = await knex("groups").select("id", "name");

  const groupId = Object.fromEntries(
    groups.map((group) => [group.name, group.id]),
  );

  // ---------------------------------------------------------------------------
  // Validate branches
  // ---------------------------------------------------------------------------

  const requiredBranches = ["MAIN", "ANNA-NAGAR"];

  for (const code of requiredBranches) {
    if (!branchId[code]) {
      throw new Error(`Branch not found: ${code}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Validate groups
  // ---------------------------------------------------------------------------

  const requiredGroups = ["owner", "manager", "front_desk", "trainer"];

  for (const name of requiredGroups) {
    if (!groupId[name]) {
      throw new Error(`Group not found: ${name}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Demo users
  // ---------------------------------------------------------------------------

  const demoRows = [];

  for (const [userId, fullName, email, password, role, branch] of DEMO_USERS) {
    demoRows.push({
      user_id: userId,

      branch_id: branchId[branch],

      // Get group ID dynamically using group name
      group_id: groupId[role],

      full_name: fullName,

      avatar_url: avatarUrl(fullName),

      email,

      password: await hashPassword(password),

      is_active: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Sample staff
  // ---------------------------------------------------------------------------

  const samplePassword = await hashPassword("staff123");

  const nextNumber = {
    manager: 2,
    front_desk: 2,
    trainer: 2,
  };

  const sampleRows = SAMPLE_STAFF.map(
    ([fullName, role, branch, active], index) => {
      const number = String(nextNumber[role]++).padStart(3, "0");

      return {
        user_id: `${ID_PREFIX[role]}-${number}`,

        branch_id: branchId[branch],

        // Get group ID dynamically using group name
        group_id: groupId[role],

        full_name: fullName,

        avatar_url: index % 5 === 3 ? null : avatarUrl(fullName),

        email: emailFor(fullName),

        password: samplePassword,

        is_active: active,
      };
    },
  );

  // ---------------------------------------------------------------------------
  // Insert all users
  // ---------------------------------------------------------------------------

  await knex("users").insert([...demoRows, ...sampleRows]);
};
