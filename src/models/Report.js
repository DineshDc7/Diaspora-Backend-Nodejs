const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Report = sequelize.define(
  "Report",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

    businessId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    createdByUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    reportType: {
      type: DataTypes.ENUM(
        "DAILY",
        "WEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "HALF_YEARLY",
        "YEARLY"
      ),
      allowNull: false,
      defaultValue: "DAILY",
    },

    // ✅ dynamic report fields for any report type
    data: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },

    notes: { type: DataTypes.TEXT, allowNull: true },

    photoPath: { type: DataTypes.STRING(255), allowNull: true },
    videoPath: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: "reports",
    timestamps: true,
    indexes: [{ fields: ["businessId"] }, { fields: ["reportType"] }, { fields: ["createdAt"] }],
  }
);

module.exports = Report;