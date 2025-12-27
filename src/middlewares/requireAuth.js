const { verifyAccessToken } = require("../utils/token");
const { parseCookies } = require("../utils/cookieParser");
const { FAIL } = require("../utils/response");

module.exports = function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.accessToken;

    if (!token) {
      return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
    }

    const payload = verifyAccessToken(token);

    // Attach to request (minimal)
    req.user = { id: payload.sub, role: payload.role };

    return next();
  } catch (err) {
    return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
  }
};