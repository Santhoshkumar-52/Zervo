const { errorResponse } = require("../../utils/response");
const { isOwner } = require("../../utils/roles");

// Use after tokenVerify: only the listed roles may continue. The owner (group 1)
// always may, whichever roles the route lists.
const authorizeRoles =
  (...authroles) =>
  (req, res, next) => {
    const roles = authroles || process.env.Granted_Roles;

    if (req.user && isOwner(req.user.role)) return next();

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
