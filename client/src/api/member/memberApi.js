import api from "../axios";

// GET /api/member
// params: { page, limit, search, memberActive, branchActive }
// Response: { success, message, data: { members: [], pagination: {} } }
export const getMembers = (params = {}) => {
  // Drop empty values so we never send ?search=&memberActive=undefined
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return api.get("/member", { params: cleanParams });
};
