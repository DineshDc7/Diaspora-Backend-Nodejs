function baseCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const secure =
    String(process.env.COOKIE_SECURE || "").toLowerCase() === "true" || isProd;

  const sameSite = (process.env.COOKIE_SAMESITE || "lax").toLowerCase(); // lax | strict | none

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };
}

function parseDurationToMs(value, fallbackMs) {
  if (!value) return fallbackMs;
  const v = String(value).trim().toLowerCase();

  // supports: "15m", "30d", "7d"
  const m = v.match(/^(\d+)\s*(m|d)$/);
  if (!m) return fallbackMs;

  const n = Number(m[1]);
  const unit = m[2];

  if (unit === "m") return n * 60 * 1000;
  if (unit === "d") return n * 24 * 60 * 60 * 1000;

  return fallbackMs;
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const opts = baseCookieOptions();

  const accessMs = parseDurationToMs(process.env.ACCESS_TOKEN_EXPIRES_IN, 15 * 60 * 1000);
  const refreshMs = parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000);

  res.cookie("accessToken", accessToken, {
    ...opts,
    maxAge: accessMs,
  });

  res.cookie("refreshToken", refreshToken, {
    ...opts,
    maxAge: refreshMs,
  });
}

function clearAuthCookies(res) {
  const opts = baseCookieOptions();
  res.clearCookie("accessToken", opts);
  res.clearCookie("refreshToken", opts);
}

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  baseCookieOptions,
};