// Group 1 is the owner / superadmin (see ROLES in staffController/schema.js).
//
// The owner is exempt from the access rules that apply to everyone else:
//   - can log in and use the API even when their branch is inactive
//     (controller/authController, middleware/auth/tokenverify)
//   - passes every authorizeRoles(...) check, whatever roles the route lists
//     (middleware/auth/authorizeRoles)
//
// tokenVerify reads the group id from the database and puts it on
// req.user.role, so pass req.user.role (or users.group_id) to isOwner.
const OWNER_GROUP_ID = 1;

const isOwner = (groupId) => Number(groupId) === OWNER_GROUP_ID;

module.exports = { OWNER_GROUP_ID, isOwner };
