const express = require("express");
const {
  addCourse,
  addDemoStudents,
  addUser,
  getCourses,
  getUsers,
  updateCourseStatus,
} = require("../controllers/adminController");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireAdmin);
router.get("/users", asyncHandler(getUsers));
router.post("/users", asyncHandler(addUser));
router.post("/demo-students", asyncHandler(addDemoStudents));
router.get("/courses", asyncHandler(getCourses));
router.post("/courses", asyncHandler(addCourse));
router.patch("/courses/:courseId", asyncHandler(updateCourseStatus));

module.exports = router;
