const router = require("express").Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const { getReports, getReportById } = require("../../controllers/admin/report.controller");


// GET /admin/reports?businessId=1&reportType=MONTHLY&page=1&limit=10
router.get("/reports", requireAuth, requireRole("ADMIN"), getReports);

// GET /admin/reports/:id
router.get("/reports/:id", requireAuth, requireRole("ADMIN"), getReportById);

module.exports = router;