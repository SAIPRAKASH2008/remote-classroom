const {
  createQuiz,
  getQuizForStudent,
  listFacultyQuizzes,
  listStudentQuizzes,
  submitQuizAttempt,
} = require("../models/quizModel");
const { getFacultyOverview } = require("../models/facultyModel");

async function getFacultyQuizData(req, res) {
  const [overview, quizzes] = await Promise.all([
    getFacultyOverview(req.session.user),
    listFacultyQuizzes(req.session.user),
  ]);
  res.json({ courses: overview.courses, quizzes });
}

async function addQuiz(req, res) {
  const { title, courseId, questions } = req.body || {};
  const parsedCourseId = Number(courseId);
  if (
    typeof title !== "string" || title.trim().length < 2 || title.trim().length > 160
    || !Number.isSafeInteger(parsedCourseId) || parsedCourseId < 1
    || !Array.isArray(questions) || questions.length < 1 || questions.length > 20
  ) {
    return res.status(400).json({ error: "Enter a title, an active course and between 1 and 20 questions." });
  }
  for (const question of questions) {
    if (
      typeof question?.prompt !== "string" || question.prompt.trim().length < 3 || question.prompt.trim().length > 1000
      || !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6
      || question.options.some((option) => typeof option !== "string" || option.trim().length < 1 || option.trim().length > 240)
      || new Set(question.options.map((option) => option.trim().toLowerCase())).size !== question.options.length
      || !Number.isInteger(question.correctOption) || question.correctOption < 0 || question.correctOption >= question.options.length
    ) {
      return res.status(400).json({ error: "Each question needs a prompt, 2–6 unique choices and one correct answer." });
    }
  }
  const quiz = await createQuiz(req.session.user, {
    title: title.trim(),
    courseId: parsedCourseId,
    questions: questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctOption: question.correctOption,
    })),
  });
  if (!quiz) return res.status(400).json({ error: "Select an active course assigned to your account." });
  res.status(201).json({ quiz });
}

async function getStudentQuizList(req, res) {
  res.json({ quizzes: await listStudentQuizzes(req.session.user) });
}

async function getStudentQuiz(req, res) {
  const quiz = await getQuizForStudent(req.params.quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found or no longer active." });
  res.json({ quiz });
}

async function submitStudentQuiz(req, res) {
  const { answers } = req.body || {};
  if (
    !Array.isArray(answers)
    || answers.some((answer) => typeof answer?.questionId !== "string" || typeof answer?.optionId !== "string")
  ) {
    return res.status(400).json({ error: "Choose an answer for every question before submitting." });
  }
  try {
    const attempt = await submitQuizAttempt(req.session.user, req.params.quizId, answers);
    if (!attempt) return res.status(404).json({ error: "Quiz not found or no longer active." });
    res.status(201).json({ attempt });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "You have already submitted this quiz." });
    if (error.code === "INVALID_ATTEMPT") return res.status(400).json({ error: error.message });
    throw error;
  }
}

module.exports = {
  addQuiz,
  getFacultyQuizData,
  getStudentQuiz,
  getStudentQuizList,
  submitStudentQuiz,
};
