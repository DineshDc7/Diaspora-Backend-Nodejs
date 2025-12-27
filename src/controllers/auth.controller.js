const bcrypt = require("bcryptjs");
const { User, RefreshToken } = require("../models");
const { OK, FAIL } = require("../utils/response");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/token");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { parseCookies } = require("../utils/cookieParser");
const { compareRefreshToken, hashRefreshToken } = require("../utils/hashToken");
const { cleanupUserRefreshTokens } = require("../utils/refreshTokenCleanup");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRefreshDays() {
  const v = String(process.env.REFRESH_TOKEN_EXPIRES_IN || "30d").toLowerCase().trim();
  const m = v.match(/^(\d+)\s*d$/); // supports "30d"
  if (m) return Number(m[1]);
  return 30;
}

// NOTE: In this step we keep validation simple and safe.
// More advanced validation can be added later without new packages.

// REGISTER //
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body;

    if (!name || typeof name !== "string") {
      return FAIL(res, "Name is required", "VALIDATION_NAME_REQUIRED", 400);
    }
    if (!isValidEmail(email)) {
      return FAIL(res, "Valid email is required", "VALIDATION_EMAIL_INVALID", 400);
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return FAIL(res, "Password must be at least 8 characters", "VALIDATION_PASSWORD_WEAK", 400);
    }

    // Optional: allow role only if it matches enum; otherwise default is applied by model
    const allowedRoles = ["ADMIN", "INVESTOR", "BUSINESS_OWNER"];
    const finalRole = role && allowedRoles.includes(role) ? role : undefined;

    // Check existing email
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return FAIL(res, "Email already exists", "AUTH_EMAIL_EXISTS", 409);
    }

    // NOTE: Do NOT check for duplicate mobile number (per requirement)

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      mobile: mobile || null,
      passwordHash,
      ...(finalRole ? { role: finalRole } : {}),
      isActive: true,
    });

    // JWT payload (minimal)
    const payload = { sub: user.id, role: user.role };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store hashed refresh token in DB
    const tokenHash = await hashRefreshToken(refreshToken);

    // expiresAt aligned with REFRESH_TOKEN_EXPIRES_IN (simple approach: 30 days default)
    const refreshDays = 30; // keep aligned with env default in Step 4
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });

    await cleanupUserRefreshTokens(user.id);

    // Set httpOnly cookies
    setAuthCookies(res, { accessToken, refreshToken });

    return OK(
      res,
      "registered",
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isActive: user.isActive,
        },
      },
      201
    );
  } catch (err) {
    console.error("register error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

// LOGIN //
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      return FAIL(res, "valid email is required", "VALIDATION_EMAIL_INVALID", 400);
    }
    if (!password || typeof password !== "string") {
      return FAIL(res, "password is required", "VALIDATION_PASSWORD_REQUIRED", 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return FAIL(res, "invalid credentials", "AUTH_INVALID_CREDENTIALS", 401);
    }
    if (!user.isActive) {
      return FAIL(res, "account is disabled", "AUTH_ACCOUNT_DISABLED", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return FAIL(res, "invalid credentials", "AUTH_INVALID_CREDENTIALS", 401);
    }

    const payload = { sub: user.id, role: user.role };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const tokenHash = await hashRefreshToken(refreshToken);

    const refreshDays = 30;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
    });

    await cleanupUserRefreshTokens(user.id);

    setAuthCookies(res, { accessToken, refreshToken });

    return OK(res, "logged_in", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

// ME - To check the login status //
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "mobile", "role", "isActive", "createdAt", "updatedAt"],
    });

    if (!user) {
      return FAIL(res, "user not found", "AUTH_USER_NOT_FOUND", 404);
    }

    return OK(res, "me", { user });
  } catch (err) {
    console.error("me error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

// REFRESH TOKEN //
exports.refresh = async (req, res) => {
  try {
    console.log("REFRESH req.headers.cookie:", req.headers.cookie);
    const cookies = parseCookies(req.headers.cookie);
    console.log("REFRESH parsed cookies keys:", Object.keys(cookies));
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
    }

    // 1) Verify refresh JWT signature + expiry
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
      console.log("REFRESH verified payload:", payload);
    } catch (e) {
      console.log("REFRESH verify error:", e && e.message ? e.message : e);
      return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
    }

    const userId = payload.sub;

    // 2) Ensure user still exists + active
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
    }

    // 3) Find a matching refresh token in DB (hashed)
    const now = new Date();
    const candidates = await RefreshToken.findAll({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      order: [["id", "DESC"]],
      limit: 20, // enough for typical multi-device usage
    });

    let matchedRow = null;
    for (const row of candidates) {
      // ignore expired rows
      if (row.expiresAt && new Date(row.expiresAt) <= now) continue;

      const matches = await compareRefreshToken(refreshToken, row.tokenHash);
      if (matches) {
        matchedRow = row;
        break;
      }
    }

    // If refresh token was valid JWT but not found in DB => token reuse / already rotated
    if (!matchedRow) {
      // optional hardening: revoke all active tokens for this user
      await RefreshToken.update(
        { revokedAt: now },
        { where: { userId: user.id, revokedAt: null } }
      );

      return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
    }

    // 4) Rotate: revoke the matched token row
    matchedRow.revokedAt = now;
    await matchedRow.save();

    // 5) Create fresh tokens
    const newPayload = { sub: user.id, role: user.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    const newTokenHash = await hashRefreshToken(newRefreshToken);
    const refreshDays = getRefreshDays();
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
      revokedAt: null,
    });

    await cleanupUserRefreshTokens(user.id);

    // 6) Set cookies
    setAuthCookies(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });

    return OK(res, "refreshed", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("refresh error:", err);
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};

// LOGOUT //
exports.logout = async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.refreshToken;

    // Always clear cookies, even if token is missing/invalid
    clearAuthCookies(res);

    if (!refreshToken) {
      return OK(res, "logged_out", null);
    }

    // Verify refresh token (best effort)
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (e) {
      // Token invalid/expired, but cookies already cleared
      return OK(res, "logged_out", null);
    }

    const userId = payload.sub;

    const now = new Date();
    const candidates = await RefreshToken.findAll({
      where: { userId, revokedAt: null },
      order: [["id", "DESC"]],
      limit: 20,
    });

    for (const row of candidates) {
      // ignore expired rows
      if (row.expiresAt && new Date(row.expiresAt) <= now) continue;

      const matches = await compareRefreshToken(refreshToken, row.tokenHash);
      if (matches) {
        row.revokedAt = now;
        await row.save();
        break;
      }
    }

    await cleanupUserRefreshTokens(userId);

    return OK(res, "logged_out", null);
  } catch (err) {
    console.error("logout error:", err);
    // cookies might still be cleared; return standard server error
    return FAIL(res, "server error", "SERVER_ERROR", 500);
  }
};