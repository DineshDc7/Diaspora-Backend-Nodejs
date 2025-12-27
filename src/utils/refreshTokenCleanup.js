const { Op } = require("sequelize");
const { RefreshToken } = require("../models");

// Deletes ONLY revoked or expired tokens (safe)
async function cleanupUserRefreshTokens(userId) {
  if (!userId) return;

  const now = new Date();

  await RefreshToken.destroy({
    where: {
      userId,
      [Op.or]: [
        { revokedAt: { [Op.not]: null } },
        { expiresAt: { [Op.lte]: now } },
      ],
    },
  });
}

module.exports = { cleanupUserRefreshTokens };