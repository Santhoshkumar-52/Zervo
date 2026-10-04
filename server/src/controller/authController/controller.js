const jwt = require("jsonwebtoken");

const db = require("../../config/knexfile");

const { hashPassword, comparePassword } = require("../../utils/hashhelper");

const { successResponse, errorResponse } = require("../../utils/response");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Token expiry values from environment
    const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

    const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

    // Validate required fields
    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    const user = await db("users")
      .where({
        email: email.toLowerCase().trim(),
        is_active: true,
      })
      .first();

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    // Check user status
    if (!user.is_active) {
      return errorResponse(
        res,
        "User account is inactive. Contact admin.",
        403,
      );
    }

    // Check user's branch
    const branch = await db("branches")
      .where({
        id: user.branch_id,
      })
      .first();

    if (!branch) {
      return errorResponse(res, "User branch is not valid", 403);
    }

    // Check branch status
    if (!branch.is_active) {
      return errorResponse(res, "User branch is inactive. Contact Admin", 403);
    }

    // Compare password
    const passwordMatches = await comparePassword(password, user.password);

    if (!passwordMatches) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    // Create access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        branchId: user.branch_id,
        email: user.email,
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: accessTokenExpiresIn,
      },
    );

    // Create refresh token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        branchId: user.branch_id,
        email: user.email,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: refreshTokenExpiresIn,
      },
    );

    // Get expiry dates from JWT payload itself
    const accessTokenExpiresAt = new Date(jwt.decode(accessToken).exp * 1000);
    const refreshTokenExpiresAt = new Date(jwt.decode(refreshToken).exp * 1000);

    // Save tokens
    await db("user_tokens").insert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      is_revoked: false,
    });
    return successResponse(
      res,
      {
        accessToken,
        refreshToken,

        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          branchId: user.branch_id,
        },
      },
      "Login successful",
    );
  } catch (error) {
    console.error("Login error:", error);

    return errorResponse(res, "Something went wrong while logging in", 500);
  }
};

const register = async (req, res) => {
  try {
    const { fullName, email, password, role, branchId } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return errorResponse(
        res,
        "Full name, email and password are required",
        400,
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await db("users")
      .where("email", normalizedEmail)
      .first();

    if (existingUser) {
      return errorResponse(res, "Email is already registered", 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const [userId] = await db("users").insert({
      full_name: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "front_desk",
      branch_id: branchId || null,
      is_active: true,
    });

    // Get created user
    const user = await db("users")
      .select(
        "id",
        "full_name",
        "email",
        "role",
        "branch_id",
        "is_active",
        "created_at",
      )
      .where("id", userId)
      .first();

    return successResponse(
      res,
      {
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          branchId: user.branch_id,
          isActive: user.is_active,
          createdAt: user.created_at,
        },
      },
      "Registration successful",
      201,
    );
  } catch (error) {
    console.error("Register error:", error);

    return errorResponse(res, "Something went wrong while registering", 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    // Get refresh token from header
    const incomingRefreshToken = req.headers["x-refresh-token"];

    if (!incomingRefreshToken) {
      return errorResponse(res, "Refresh token is required", 401);
    }

    // Verify refresh token JWT
    let decodedToken;

    try {
      decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.JWT_REFRESH_SECRET,
      );
    } catch (error) {
      return errorResponse(res, "Invalid or expired refresh token", 401);
    }

    // Find valid token record (compare the stored refresh token)
    const tokenRecord = await db("user_tokens")
      .where({
        refresh_token: incomingRefreshToken,
        user_id: decodedToken.userId,
        is_revoked: false,
      })
      .where("refresh_token_expires_at", ">", new Date())
      .first();

    if (!tokenRecord) {
      return errorResponse(res, "Refresh token is invalid or expired", 401);
    }

    // Get user
    const user = await db("users")
      .where({
        id: decodedToken.userId,
        is_active: true,
      })
      .first();

    if (!user) {
      return errorResponse(
        res,
        "User account is inactive or does not exist",
        401,
      );
    }

    // Get access token expiry from environment
    const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        branchId: user.branch_id,
        email: user.email,
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: accessTokenExpiresIn,
      },
    );

    // Save new access token
    const newAccessTokenExpiresAt = new Date(
      jwt.decode(newAccessToken).exp * 1000,
    );

    await db("user_tokens").where("id", tokenRecord.id).update({
      access_token: newAccessToken,
      access_token_expires_at: newAccessTokenExpiresAt,
      updated_at: new Date(),
    });

    // Return new access token + same refresh token
    return successResponse(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: incomingRefreshToken,

        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          branchId: user.branch_id,
        },
      },
      "Token refreshed successfully",
    );
  } catch (error) {
    console.error("Refresh token error:", error);

    return errorResponse(
      res,
      "Something went wrong while refreshing token",
      500,
    );
  }
};

module.exports = {
  register,
  login,
  refreshToken,
};
