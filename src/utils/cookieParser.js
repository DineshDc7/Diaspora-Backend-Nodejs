function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return cookies;

  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const [k, ...v] = part.trim().split("=");
    if (!k) continue;
    cookies[k] = decodeURIComponent(v.join("=") || "");
  }

  return cookies;
}

module.exports = { parseCookies };