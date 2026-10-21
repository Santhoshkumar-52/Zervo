const { hashPassword } = require("../../utils/hashhelper");

// Placeholder avatars
const avatarUrl = (name) =>
  `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(name)}`;

// -----------------------------------------------------------------------------
// Demo users
// role is used only to look up groups.id
// gender is "male", "female" or "others" (same values as the users.gender column)
// -----------------------------------------------------------------------------

const DEMO_USERS = [
  ["owner-001", "Gym Owner", "owner@gym.com", "owner123", "owner", "MAIN", "male"],
  [
    "manager-001",
    "Gym Manager",
    "manager@gym.com",
    "manager123",
    "manager",
    "MAIN",
    "female",
  ],
  [
    "frontdesk-001",
    "Front Desk",
    "frontdesk@gym.com",
    "frontdesk123",
    "front_desk",
    "ANNA-NAGAR",
    "female",
  ],
  [
    "trainer-001",
    "Gym Trainer",
    "trainer@gym.com",
    "trainer123",
    "trainer",
    "ANNA-NAGAR",
    "male",
  ],
];

// -----------------------------------------------------------------------------
// Sample staff
// role is used only to look up groups.id
// Columns: [name, role, branch, active, gender]
// -----------------------------------------------------------------------------

const SAMPLE_STAFF = [
  // ---------------------------------------------------------------------------
  // MAIN
  // ---------------------------------------------------------------------------

  ["Ramesh Iyer", "manager", "MAIN", true, "male"],
  ["Sangeetha Rao", "manager", "MAIN", false, "female"],

  ["Kavya Raman", "front_desk", "MAIN", true, "female"],
  ["Pooja Menon", "front_desk", "MAIN", true, "female"],
  ["Naveen Kumar", "front_desk", "MAIN", false, "male"],
  ["Tamilselvi Arjun", "front_desk", "MAIN", true, "female"],
  ["Janaki Ammal", "front_desk", "MAIN", true, "female"],

  ["Aravind Swamy", "trainer", "MAIN", true, "male"],
  ["Bala Murugan", "trainer", "MAIN", true, "male"],
  ["Chitra Devi", "trainer", "MAIN", true, "female"],
  ["Dinesh Kannan", "trainer", "MAIN", false, "male"],
  ["Elango Sundaram", "trainer", "MAIN", true, "male"],
  ["Farhana Begum", "trainer", "MAIN", true, "female"],
  ["Gokul Raj", "trainer", "MAIN", false, "male"],
  ["Hema Latha", "trainer", "MAIN", true, "female"],
  ["Ilango Ramesh", "trainer", "MAIN", true, "male"],
  ["Karthikeyan Pillai", "trainer", "MAIN", true, "male"],
  ["Latha Mahesh", "trainer", "MAIN", true, "female"],

  // ---------------------------------------------------------------------------
  // ANNA-NAGAR
  // ---------------------------------------------------------------------------

  ["Suresh Venkatesh", "manager", "ANNA-NAGAR", true, "male"],
  ["Meera Krishnan", "manager", "ANNA-NAGAR", true, "female"],

  ["Lavanya Prakash", "front_desk", "ANNA-NAGAR", true, "female"],
  ["Mythili Sekar", "front_desk", "ANNA-NAGAR", true, "female"],
  ["Naresh Babu", "front_desk", "ANNA-NAGAR", false, "male"],
  ["Oviya Sathish", "front_desk", "ANNA-NAGAR", true, "female"],

  ["Prakash Raj", "trainer", "ANNA-NAGAR", true, "male"],
  ["Revathi Gopal", "trainer", "ANNA-NAGAR", true, "female"],
  ["Sathish Kumar", "trainer", "ANNA-NAGAR", true, "male"],
  ["Thilaga Rani", "trainer", "ANNA-NAGAR", false, "female"],
  ["Udhay Kumar", "trainer", "ANNA-NAGAR", true, "male"],
  ["Vasanth Ravi", "trainer", "ANNA-NAGAR", true, "male"],
  ["Yamini Devi", "trainer", "ANNA-NAGAR", false, "female"],
  ["Zaheer Ahmed", "trainer", "ANNA-NAGAR", true, "male"],
  ["Abinaya Selvaraj", "trainer", "ANNA-NAGAR", true, "female"],
  ["Bharath Chandran", "trainer", "ANNA-NAGAR", true, "male"],
  ["Charulatha Nair", "trainer", "ANNA-NAGAR", true, "female"],
  ["Deepak Vijay", "trainer", "ANNA-NAGAR", true, "male"],
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
// Generate a mobile number (users.phone)
//
// 10 digits starting with 98, different for every number 1, 2, 3 ...
// Numbers are unique, which the users_branch_phone_unique index needs. Demo
// users take 1-4, sample staff take 11 and up, so they never clash.
// -----------------------------------------------------------------------------

const phoneFor = (number) => String(9800000000 + number * 7919);

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

  for (const [
    userId,
    fullName,
    email,
    password,
    role,
    branch,
    gender,
  ] of DEMO_USERS) {
    demoRows.push({
      user_id: userId,

      branch_id: branchId[branch],

      // Get group ID dynamically using group name
      group_id: groupId[role],

      full_name: fullName,

      gender,

      avatar_url: avatarUrl(fullName),

      email,

      phone: phoneFor(demoRows.length + 1),

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
    ([fullName, role, branch, active, gender], index) => {
      const number = String(nextNumber[role]++).padStart(3, "0");

      return {
        user_id: `${ID_PREFIX[role]}-${number}`,

        branch_id: branchId[branch],

        // Get group ID dynamically using group name
        group_id: groupId[role],

        full_name: fullName,

        gender,

        avatar_url: index % 5 === 3 ? null : avatarUrl(fullName),

        email: emailFor(fullName),

        phone: phoneFor(11 + index),

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
