const jwt = require("jsonwebtoken");

const db = require("../../config/knexfile"); // adjust path
const { errorResponse } = require("../../utils/response");

const tokenVerify = async (req, res, next) => {
  try {
    // 1. Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, "Access token is required", 401, {
        code: "TOKEN_MISSING",
      });
    }

    // Expected:
    // Authorization: Bearer <token>
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return errorResponse(res, "Invalid authorization format", 401, {
        code: "TOKEN_INVALID",
      });
    }

    // 2. Verify JWT signature + expiry
    let decodedToken;

    try {
      decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return errorResponse(res, "Access token has expired", 401, {
          code: "TOKEN_EXPIRED",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return errorResponse(res, "Invalid access token", 401, {
          code: "TOKEN_INVALID",
        });
      }

      throw error;
    }

    // 3. Check token against DB
    //
    // This is what allows you to revoke/invalidate
    // a JWT before its JWT expiry time.
    const session = await db("user_tokens as t")
      .join("users as u", "u.id", "t.user_id")
      .join("branches as b", "u.branch_id", "b.id")
      .where({
        "t.user_id": decodedToken.userId,
        "t.access_token": token,
        "t.is_revoked": false,
        "u.is_active": true,
        "b.is_active": true,
      })
      .where("t.access_token_expires_at", ">", new Date())
      .select("u.id", "u.full_name", "u.email", "u.role", "u.branch_id")
      .first();

    // 4. Token doesn't exist / revoked / expired / user inactive
    if (!session) {
      return errorResponse(res, "Session is invalid or has been revoked", 401, {
        code: "SESSION_INVALID",
      });
    }

    // 5. Attach user from DB
    //
    // Prefer DB values rather than trusting mutable
    // user information from the JWT payload.
    req.user = {
      userId: session.id,
      role: session.role,
      fullName: session.full_name,
      branchId: session.branch_id,
      email: session.email,
    };

    // 6. Continue to controller
    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return errorResponse(res, "Authentication failed", 500);
  }
};

module.exports = tokenVerify;
