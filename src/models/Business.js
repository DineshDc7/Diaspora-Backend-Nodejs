const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Business = sequelize.define(
  "Business",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

    ownerUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    businessName: { type: DataTypes.STRING(150), allowNull: false },

    ownerName: { type: DataTypes.STRING(120), allowNull: false },

    ownerPhone: { type: DataTypes.STRING(20), allowNull: true },

    category: { type: DataTypes.STRING(80), allowNull: false },

    city: { type: DataTypes.STRING(80), allowNull: false },

    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "businesses",
    timestamps: true,
    indexes: [
      { fields: ["businessName"] },
      { fields: ["category"] },
      { fields: ["city"] },
      { fields: ["ownerUserId"] },
      { fields: ["isActive"] },
    ],
  }
);

module.exports = Business;