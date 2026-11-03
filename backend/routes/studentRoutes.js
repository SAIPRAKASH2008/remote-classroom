const express = require("express");
const { getCourses, getTimetable } = require("../controllers/studentController");
const { requireAuth, requireStudent } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireStudent);
router.get("/courses", asyncHandler(getCourses));
router.get("/timetable", asyncHandler(getTimetable));

module.exports = router;
