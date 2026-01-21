const router = require("express").Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const {
  getBusinessOwnerDashboardOverview,
} = require("../../controllers/business-owner/dashboard.controller");

// GET /business-owner/dashboard/overview
router.get(
  "/dashboard/overview",
  requireAuth,
  requireRole("BUSINESS_OWNER"),
  getBusinessOwnerDashboardOverview
);

module.exports = router;