const express = require("express");
const {
  getStudentQuiz,
  getStudentQuizList,
  submitStudentQuiz,
} = require("../controllers/quizController");
const { requireAuth, requireStudent } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireStudent);
router.get("/", asyncHandler(getStudentQuizList));
router.get("/:quizId", asyncHandler(getStudentQuiz));
router.post("/:quizId/attempts", asyncHandler(submitStudentQuiz));

module.exports = router;
