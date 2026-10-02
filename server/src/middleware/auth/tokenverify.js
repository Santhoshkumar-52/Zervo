const jwt = require("jsonwebtoken");

const { errorResponse } = require("../../utils/response");

const tokenVerify = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, "Access token is required", 401);
    }

    // Expected format:
    // Authorization: Bearer <token>
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return errorResponse(res, "Invalid authorization format", 401);
    }

    // Verify access token
    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach authenticated user information
    req.user = {
      userId: decodedToken.userId,
      role: decodedToken.role,
      fullName: decodedToken.fullName,
      branchId: decodedToken.branchId,
      email: decodedToken.email,
    };

    // Continue to controller
    next();
  } catch (error) {
    // Token expired
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Access token has expired", 401);
    }

    // Invalid signature / malformed token
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid access token", 401);
    }

    // Any unexpected authentication error
    console.error("Authentication middleware error:", error);

    return errorResponse(res, "Authentication failed", 401);
  }
};

module.exports = tokenVerify;
