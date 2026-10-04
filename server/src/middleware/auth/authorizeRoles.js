const { errorResponse } = require("../../utils/response");

// Use after tokenVerify: only the listed roles may continue.
const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        "You do not have permission to perform this action. Contact Admin",
        403,
      );
    }

    return next();
  };

module.exports = authorizeRoles;
