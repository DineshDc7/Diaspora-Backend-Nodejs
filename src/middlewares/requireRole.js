const { FAIL } = require("../utils/response");

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return FAIL(res, "unauthorized", "AUTH_UNAUTHORIZED", 401);
    }

    if (req.user.role !== requiredRole) {
      return FAIL(res, "forbidden", "AUTH_FORBIDDEN", 403);
    }

    return next();
  };
}

module.exports = requireRole;