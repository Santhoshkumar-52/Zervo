const { errorResponse } = require("../../utils/response");

// Use after tokenVerify: only the listed roles may continue.
const authorizeRoles = () => (req, res, next) => {
  const roles = process.env.Granted_Roles;

  if (!req.user || !roles.includes(req.user.role)) {
    return errorResponse(
      res,
      "You do not have permission to perform this action. Contact Admin",
      403,
    );
  }

  return next();
};

module.exports = authorizeRoles;
