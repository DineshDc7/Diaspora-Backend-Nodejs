const express = require("express");
const router = express.Router();

const { register, login, me, refresh, logout } = require("../controllers/auth.controller");
const requireAuth = require("../middlewares/requireAuth");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/me", requireAuth, me);

module.exports = router;