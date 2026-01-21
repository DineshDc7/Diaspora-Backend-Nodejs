const router = require("express").Router();

const requireAuth = require("../../middlewares/requireAuth");
const requireRole = require("../../middlewares/requireRole");

const {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
  getUserStats,
  getUserById,
  getUsersOverview,
  getUserOptions,
} = require("../../controllers/admin/user.controller");


// LIST
router.get("/users", requireAuth, requireRole("ADMIN"), getUsers);

// CREATE
router.post("/users", requireAuth, requireRole("ADMIN"), createUser);

// STATS (static route must come before :id)
router.get("/users/stats", requireAuth, requireRole("ADMIN"), getUserStats);

// OVERVIEW (static route must come before :id)
router.get("/users/overview", requireAuth, requireRole("ADMIN"), getUsersOverview);

// GET /admin/users/options?role=BUSINESS_OWNER
router.get("/users/options", requireAuth, requireRole("ADMIN"), getUserOptions);

// PATCH /admin/users/:id/status
router.patch("/users/:id/status", requireAuth, requireRole("ADMIN"), updateUserStatus);

// DETAILS (removed param regex to fix Express 5 crash)
router.get("/users/:id", requireAuth, requireRole("ADMIN"), getUserById);

// UPDATE (removed param regex to fix Express 5 crash)
router.put("/users/:id", requireAuth, requireRole("ADMIN"), updateUser);

module.exports = router;






// A) All users (tab=all)

// GET /admin/users?tab=all

// B) Admin tab

// GET /admin/users?tab=admins

// C) Owners tab

// GET /admin/users?tab=owners

// D) Investors tab

// GET /admin/users?tab=investors

// E) Search by name/email/phone

// GET /admin/users?search=9999

// F) Only active users

// GET /admin/users?isActive=true

// G) Sort by name ascending

// GET /admin/users?sortBy=name&order=asc



// USER OVERVIEW //
//GET /admin/users/overview
// GET /admin/users/overview?tab=investors
// GET /admin/users/overview?search=john&page=1&limit=5
// {
//   "success": true,
//   "message": "users_overview",
//   "data": {
//     "users": [...],
//     "pagination": {...},
//     "stats": {
//       "totalUsers": 10,
//       "countsByRole": {
//         "ADMIN": 2,
//         "INVESTOR": 5,
//         "BUSINESS_OWNER": 3
//       }
//     }
//   }
// }