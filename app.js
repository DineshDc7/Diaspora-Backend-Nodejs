require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const { testDbConnection, syncDb } = require("./src/models");
const path = require("path");

// IMPORT ROUTES //
const authRoutes = require("./src/routes/auth.routes");
const pingRoutes = require("./src/routes/ping.routes");
const adminUserRoutes = require("./src/routes/admin/user.routes");
const adminBusinessRoutes = require("./src/routes/admin/business.routes");
const businessOwnerReportRoutes = require("./src/routes/business-owner/report.routes");
const adminReportRoutes = require("./src/routes/admin/report.routes");
const adminDashboardRoutes = require("./src/routes/admin/dashboard.routes");


// APP INITIALIZE //
const app = express();

// MIDDLEWARES //
app.set("trust proxy", 1);
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// HEALTH CHECK //
app.get("/health", (req, res) => {
  return res.json({ ok: true, service: "diaspora-backend", env: process.env.NODE_ENV });
});

// USE ROUTES //
app.use("/auth", authRoutes);
app.use("/", pingRoutes);
app.use("/admin", adminUserRoutes);
app.use("/admin", adminBusinessRoutes);
app.use("/admin", adminReportRoutes);
app.use("/admin", adminDashboardRoutes);
app.use("/business-owner", businessOwnerReportRoutes);


// 404 NOT FOUND //
app.use((req, res) => {
  return res.status(404).json({ message: "Route not found" });
});

// ERROR HANDLER //
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Server error" });
});

// PORT - TEST CONNECTION - SYNC DB //
const PORT = Number(process.env.PORT || 8080);
testDbConnection();
syncDb();

// APP LISTEN //
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});