const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    tokenHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "refresh_tokens",
    createdAt: true,
    updatedAt: false, // we only care createdAt + revokedAt
    indexes: [{ fields: ["userId"] }, { fields: ["expiresAt"] }, { fields: ["revokedAt"] }],
  }
);

module.exports = RefreshToken;