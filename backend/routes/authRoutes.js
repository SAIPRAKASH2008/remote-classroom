const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { currentUser, login, logout } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again later." },
});

router.post("/login", loginLimiter, asyncHandler(login));
router.get("/me", currentUser);
router.post("/logout", requireAuth, logout);

module.exports = router;
