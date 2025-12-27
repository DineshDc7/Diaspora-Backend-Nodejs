const bcrypt = require("bcryptjs");

// We hash refresh tokens before storing in DB.
// Using bcrypt means we can safely compare later without storing the raw token.
async function hashRefreshToken(rawToken) {
  const saltRounds = 12;
  return bcrypt.hash(rawToken, saltRounds);
}

async function compareRefreshToken(rawToken, tokenHash) {
  return bcrypt.compare(rawToken, tokenHash);
}

module.exports = {
  hashRefreshToken,
  compareRefreshToken,
};