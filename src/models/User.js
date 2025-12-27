const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

    name: { type: DataTypes.STRING(100), allowNull: false },

    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    email: { type: DataTypes.STRING(191), allowNull: false, unique: true },

    passwordHash: { type: DataTypes.STRING(255), allowNull: false },

    role: {
      type: DataTypes.ENUM("ADMIN", "INVESTOR", "BUSINESS_OWNER"),
      allowNull: false,
      defaultValue: "INVESTOR",
    },

    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      { fields: ["role"] },
      { fields: ["isActive"] },
    ],
  }
);

module.exports = User;