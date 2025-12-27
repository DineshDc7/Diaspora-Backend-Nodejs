const router = require("express").Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const {
  getBusinesses,
  createBusiness,
  getBusinessOptions,
  getBusinessById,
  updateBusiness,
} = require("../../controllers/admin/business.controller");

// LIST
router.get("/businesses", requireAuth, requireRole("ADMIN"), getBusinesses);

// CREATE
router.post("/businesses", requireAuth, requireRole("ADMIN"), createBusiness);

// ✅ OPTIONS (must come before :id)
router.get("/businesses/options", requireAuth, requireRole("ADMIN"), getBusinessOptions);

// DETAILS
router.get("/businesses/:id", requireAuth, requireRole("ADMIN"), getBusinessById);

// UPDATE
router.put("/businesses/:id", requireAuth, requireRole("ADMIN"), updateBusiness);

module.exports = router;