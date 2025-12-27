const express = require("express");
const router = express.Router();

const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const { OK } = require("../utils/response");

// ADMIN ping
router.get("/admin/ping", requireAuth, requireRole("ADMIN"), (req, res) => {
  return OK(res, "admin pong", { role: req.user.role, userId: req.user.id });
});

// INVESTOR ping
router.get("/investor/ping", requireAuth, requireRole("INVESTOR"), (req, res) => {
  return OK(res, "investor pong", { role: req.user.role, userId: req.user.id });
});

// BUSINESS_OWNER ping
router.get("/business-owner/ping", requireAuth, requireRole("BUSINESS_OWNER"), (req, res) => {
  return OK(res, "business owner pong", { role: req.user.role, userId: req.user.id });
});

module.exports = router;