const express = require("express");
const { getOverview, submitGrade } = require("../controllers/facultyController");
const { addQuiz, getFacultyQuizData } = require("../controllers/quizController");
const { requireAuth, requireFaculty } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireFaculty);
router.get("/overview", asyncHandler(getOverview));
router.get("/quizzes", asyncHandler(getFacultyQuizData));
router.post("/quizzes", asyncHandler(addQuiz));
router.patch("/submissions/:submissionId/grade", asyncHandler(submitGrade));

module.exports = router;
