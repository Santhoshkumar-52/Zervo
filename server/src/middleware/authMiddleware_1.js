const jwt = require("jsonwebtoken");

const db = require("../config/knexfile");
const { errorResponse } = require("../utils/response");

/**
 * Protects a route with the access token.
 *
 * Expects:  Authorization: Bearer <accessToken>
 * On success: sets req.user and calls next()
 * On failure: 401 with errors.code so the client can react:
 *   TOKEN_MISSING | TOKEN_INVALID | TOKEN_EXPIRED | SESSION_INVALID
 * (The axios interceptor refreshes on any 401.)
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Read the Bearer token
    const [scheme, token] = (req.headers.authorization || "").split(" ");

    if (scheme !== "Bearer" || !token) {
      return errorResponse(res, "Access token is required", 401, {
        code: "TOKEN_MISSING",
      });
    }

    // 2. Verify signature + expiry
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return errorResponse(res, "Access token has expired", 401, {
          code: "TOKEN_EXPIRED",
        });
      }

      return errorResponse(res, "Invalid access token", 401, {
        code: "TOKEN_INVALID",
      });
    }
    console.log("TOKEN FROM REQUEST:", token);
    console.log("DECODED:", decoded);
    // 3. Compare with the token saved in the DB (live, not revoked, user active)
    const session = await db("user_tokens as t")
      .join("users as u", "u.id", "t.user_id")
      .where({
        "t.user_id": decoded.userId,
        "t.access_token": token,
        "t.is_revoked": false,
        "u.is_active": true,
      })
      .where("t.access_token_expires_at", ">", new Date())
      .select("u.id", "u.full_name", "u.email", "u.role", "u.branch_id")
      .first();

    if (!session) {
      return errorResponse(res, "Session is invalid or has been revoked", 401, {
        code: "SESSION_INVALID",
      });
    }

    // 4. Attach the user for downstream handlers
    req.user = {
      userId: session.id,
      fullName: session.full_name,
      email: session.email,
      role: session.role,
      branchId: session.branch_id,
    };

    return next();
  } catch (error) {
    // DB/server problem: 500, not 401, so the client doesn't log the user out
    console.error("Auth middleware error:", error);

    return errorResponse(
      res,
      "Something went wrong while verifying access token",
      500,
    );
  }
};

module.exports = { authenticate };
