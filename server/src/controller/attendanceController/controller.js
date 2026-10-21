const db = require("../../config/knexfile");
const { successResponse, errorResponse } = require("../../utils/response");
const {
  checkInSchema,
  checkInStaffSchema,
  formatZodError,
} = require("./schema");

// A plan that ends within this many days is reported as "expiring soon".
const EXPIRING_SOON_DAYS = 7;

// Member of the logged-in user's branch. Soft-deleted rows are hidden.
const findMember = (memberNo, branchId) =>
  db("members")
    .join("branches", "members.branch_id", "branches.id")
    .leftJoin("users", "members.assigned_trainer_id", "users.id")
    .where("members.member_Id", memberNo)
    .where("members.branch_id", branchId)
    .whereNull("members.deleted_at")
    .first(
      "members.id",
      "members.member_Id",
      "members.branch_id",
      "members.first_name",
      "members.last_name",
      "members.phone",
      "members.email",
      "members.avatar_url",
      "members.is_active",
      "branches.name as branch_name",
      "users.full_name as trainer_name",
    );

// Subscriptions of a member that are running today (start <= today <= end).
// Dates are compared and counted in SQL so the server timezone cannot shift them.
const activeSubscriptionQuery = (memberId, branchId) =>
  db("subs_summ")
    .where({ member_id: memberId, branch_id: branchId })
    .whereNull("deleted_at")
    .whereRaw("start_date <= CURDATE()")
    .whereRaw("end_date >= CURDATE()");

// POST /api/member/attendance/check-in   body: { member_id }
// branch_id and created_by come from the logged-in user.
const checkInMember = async (req, res) => {
  try {
    const parsed = checkInSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;
    const memberNo = parsed.data.member_id;

    // 1. Member must exist in this branch.
    const member = await findMember(memberNo, branchId);

    if (!member) {
      return errorResponse(res, "Member not found in this branch", 404);
    }

    if (!member.is_active) {
      return errorResponse(res, "Member is inactive", 403);
    }

    // 2. Member must have a plan that has started and has not expired.
    const subscription = await activeSubscriptionQuery(member.id, branchId)
      .orderBy("end_date", "desc")
      .first(
        "id",
        "subscription_no",
        db.raw("DATE_FORMAT(start_date, '%Y-%m-%d') as start_date"),
        db.raw("DATE_FORMAT(end_date, '%Y-%m-%d') as end_date"),
        db.raw("DATEDIFF(end_date, CURDATE()) as days_left"),
      );

    if (!subscription) {
      // Tell the front desk whether the plan ran out or never existed.
      const lastSubscription = await db("subs_summ")
        .where({ member_id: member.id, branch_id: branchId })
        .whereNull("deleted_at")
        .orderBy("end_date", "desc")
        .first(db.raw("DATE_FORMAT(end_date, '%Y-%m-%d') as end_date"));

      return errorResponse(
        res,
        lastSubscription
          ? `Plan expired on ${lastSubscription.end_date}`
          : "Member has no active plan",
        403,
      );
    }

    const daysLeft = Number(subscription.days_left);

    // 3. Expiring within 7 days: send the days left.
    const expiringSoon = daysLeft <= EXPIRING_SOON_DAYS;

    let expiryMessage = null;

    if (expiringSoon) {
      expiryMessage =
        daysLeft === 0
          ? "Plan expires today"
          : `Plan expiring in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    }

    // Record the check-in.
    const [attendanceId] = await db("mem_attendance").insert({
      member_id: member.id,
      branch_id: branchId,
      checkinat: db.fn.now(),
      created_by: userId,
      updated_by: userId,
    });

    const attendance = await db("mem_attendance")
      .where("id", attendanceId)
      .first("id", "checkinat");

    const plans = await db("subs_items")
      .where("subs_summ_id", subscription.id)
      .whereNull("deleted_at")
      .where("item_type", "membership")
      .pluck("item_name");

    // 4. Details for the front desk screen.
    return successResponse(
      res,
      {
        attendance: {
          id: attendance.id,
          checkin_at: attendance.checkinat,
        },
        member: {
          id: member.id,
          member_id: member.member_Id,
          name: [member.first_name, member.last_name].filter(Boolean).join(" "),
          phone: member.phone,
          email: member.email,
          avatar_url: member.avatar_url,
          branch_name: member.branch_name,
          trainer_name: member.trainer_name,
        },
        plan: {
          subscription_no: subscription.subscription_no,
          plan_names: plans,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          days_left: daysLeft,
          expiring_soon: expiringSoon,
          message: expiryMessage,
        },
      },
      expiryMessage
        ? `Check-in successful. ${expiryMessage}`
        : "Check-in successful",
      201,
    );
  } catch (error) {
    console.error("Error checking in member:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

// Staff member of the logged-in user's branch, found by the business ID
// (users.user_id). Soft-deleted rows are hidden. Never select `password`.
const findStaffMember = (userNo, branchId) =>
  db("users")
    .join("branches", "users.branch_id", "branches.id")
    .join("groups", "users.group_id", "groups.id")
    .where("users.user_id", userNo)
    .where("users.branch_id", branchId)
    .whereNull("users.deleted_at")
    .first(
      "users.id",
      "users.user_id",
      "users.branch_id",
      "users.full_name",
      "users.email",
      "users.gender",
      "users.avatar_url",
      "users.is_active",
      "branches.name as branch_name",
      "groups.name as group_name",
    );

// POST /api/staff/attendance/check-in   body: { user_id }
// branch_id and created_by come from the logged-in user. Staff have no plan,
// so there is no subscription check; checkout is filled in later.
const checkInStaff = async (req, res) => {
  try {
    const parsed = checkInStaffSchema.safeParse(req.body);

    if (!parsed.success) {
      return errorResponse(
        res,
        "Validation failed",
        400,
        formatZodError(parsed.error),
      );
    }

    const { branchId, userId } = req.user;
    const userNo = parsed.data.user_id;

    // 1. Staff member must exist in this branch.
    const staff = await findStaffMember(userNo, branchId);

    if (!staff) {
      return errorResponse(res, "Staff not found in this branch", 404);
    }

    if (!staff.is_active) {
      return errorResponse(res, "Staff is inactive", 403);
    }

    // Record the check-in.
    const [attendanceId] = await db("staff_attendance").insert({
      user_id: staff.id,
      branch_id: branchId,
      checkinat: db.fn.now(),
      created_by: userId,
      updated_by: userId,
    });

    const attendance = await db("staff_attendance")
      .where("id", attendanceId)
      .first("id", "checkinat");

    // 2. Details for the front desk screen.
    return successResponse(
      res,
      {
        attendance: {
          id: attendance.id,
          checkin_at: attendance.checkinat,
        },
        staff: {
          id: staff.id,
          user_id: staff.user_id,
          name: staff.full_name,
          email: staff.email,
          gender: staff.gender,
          avatar_url: staff.avatar_url,
          branch_name: staff.branch_name,
          group_name: staff.group_name,
        },
      },
      "Check-in successful",
      201,
    );
  } catch (error) {
    console.error("Error checking in staff:", error);

    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  checkInMember,
  checkInStaff,
};
