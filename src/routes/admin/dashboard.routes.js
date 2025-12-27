const router = require("express").Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const {
  getAdminDashboardOverview,
} = require("../../controllers/admin/dashboard.controller");

// GET /admin/dashboard/overview
router.get(
  "/dashboard/overview",
  requireAuth,
  requireRole("ADMIN"),
  getAdminDashboardOverview
);

module.exports = router;