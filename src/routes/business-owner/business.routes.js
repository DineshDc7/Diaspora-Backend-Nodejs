const router = require("express").Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const {
  getMyBusinesses,
  getMyBusinessById,
  updateMyBusiness,
} = require("../../controllers/business-owner/business.controller");

// GET /business-owner/businesses
router.get("/businesses", requireAuth, requireRole("BUSINESS_OWNER"), getMyBusinesses);

// GET /business-owner/businesses/:id
router.get("/businesses/:id", requireAuth, requireRole("BUSINESS_OWNER"), getMyBusinessById);

// PUT /business-owner/businesses/:id
router.put(
  "/businesses/:id",
  requireAuth,
  requireRole("BUSINESS_OWNER"),
  updateMyBusiness
);

module.exports = router;