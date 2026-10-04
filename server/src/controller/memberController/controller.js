const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");

const getmembers = async (req, res) => {
  try {
    const { branchId } = req.user;

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const memberActive = req.query.memberActive;
    const branchActive = req.query.branchActive;

    const baseQuery = db("members")
      .join("branches", "members.branch_id", "branches.id")
      .leftJoin("users", "members.assigned_trainer_id", "users.id")
      .where("members.branch_id", branchId);

    if (search) {
      baseQuery.where((query) => {
        query
          .whereRaw(
            "CONCAT_WS(' ', members.first_name, members.last_name) LIKE ?",
            [`%${search}%`],
          )
          .orWhere("members.email", "like", `%${search}%`)
          .orWhere("members.phone", "like", `%${search}%`)
          .orWhere("users.full_name", "like", `%${search}%`);
      });
    }

    if (memberActive !== undefined) {
      baseQuery.where("members.is_active", memberActive === "true");
    }

    if (branchActive !== undefined) {
      baseQuery.where("branches.is_active", branchActive === "true");
    }

    const [{ total }] = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct("members.id as total");

    const members = await baseQuery
      .clone()
      .select(
        "members.id",
        "members.member_Id",
        db.raw(
          "CONCAT_WS(' ', members.first_name, members.last_name) as member_name",
        ),
        "members.email",
        "members.phone",
        "members.is_active",
        "members.branch_id",
        "members.assigned_trainer_id",
        "members.first_name",
        "members.last_name",
        "members.avatar_url",
        // plain YYYY-MM-DD so the client date input is not shifted by timezone
        db.raw("DATE_FORMAT(members.joined_on, '%Y-%m-%d') as joined_on"),

        "branches.name as branch_name",
        "branches.is_active as branch_is_active",

        "users.id as trainer_id",
        "users.full_name as trainer_name",
        "users.email as trainer_email",
      )
      .orderBy("members.joined_on", "desc")
      .limit(limit)
      .offset(offset);

    const totalMembers = Number(total);
    const totalPages = Math.ceil(totalMembers / limit);

    return successResponse(
      res,
      {
        members,
        pagination: {
          page,
          limit,
          total: totalMembers,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      "Members fetched successfully",
    );
  } catch (error) {
    console.error("Error fetching members:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = { getmembers };
