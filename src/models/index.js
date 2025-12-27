const sequelize = require("../config/db");

const User = require("./User");
const RefreshToken = require("./RefreshToken");
const Business = require("./Business");
const Report = require("./Report");

// Associations
User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

// Business ↔ Reports
Business.hasMany(Report, { foreignKey: "businessId", as: "reports" });
Report.belongsTo(Business, { foreignKey: "businessId", as: "business" });

// User ↔ Reports (creator)
User.hasMany(Report, { foreignKey: "createdByUserId", as: "createdReports" });
Report.belongsTo(User, { foreignKey: "createdByUserId", as: "createdBy" });

async function testDbConnection() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected successfully");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}

async function syncDb() {
  try {
    // For now: create tables if not exist (safe for early dev)
    await sequelize.sync({  });//alter: true
    console.log("✅ DB synced successfully");
  } catch (err) {
    console.error("❌ DB sync failed:", err.message);
    process.exit(1);
  }
}

module.exports = {
  sequelize,
  User,
  RefreshToken,
  testDbConnection,
  syncDb,
  Business,
  Report,
};