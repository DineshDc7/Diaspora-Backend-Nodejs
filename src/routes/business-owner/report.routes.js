const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const {
  createReport,
  getReports,
  getReportsStats,
  getReportById,
} = require("../../controllers/business-owner/report.controller");


// Storage: <project-root>/uploads/reports
// Use process.cwd() so we don't end up with duplicated /src/src/... paths in production.
const REPORTS_UPLOAD_DIR = path.join(process.cwd(), "uploads", "reports");
fs.mkdirSync(REPORTS_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, REPORTS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

// Accept only images/videos
function fileFilter(req, file, cb) {
  const isImage = file.mimetype.startsWith("image/");
  const isVideo = file.mimetype.startsWith("video/");
  if (!isImage && !isVideo) return cb(new Error("Only image/video files are allowed"), false);
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // 10MB photo, 100MB video
    fileSize: 100 * 1024 * 1024,
  },
});

// Fields expected from form
const uploadFields = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

// POST /business-owner/reports
router.post(
  "/reports",
  requireAuth,
  requireRole("BUSINESS_OWNER"),
  uploadFields,
  createReport
);

// GET /business-owner/reports?businessId=1&reportType=DAILY&page=1&limit=10
router.get(
  "/reports",
  requireAuth,
  requireRole("BUSINESS_OWNER"),
  getReports
);

// GET /business-owner/reports/stats
router.get(
  "/reports/stats",
  requireAuth,
  requireRole("BUSINESS_OWNER"),
  getReportsStats
);

// GET /business-owner/reports/:id
router.get(
  "/reports/:id",
  requireAuth,
  requireRole("BUSINESS_OWNER"),
  getReportById
);

module.exports = router;