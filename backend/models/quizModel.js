const crypto = require("crypto");
const { db } = require("../config/database");
const { getFacultyOverview } = require("./facultyModel");

const localQuizzes = [];
const localAttempts = new Map();

function makeQuestions(questions) {
  return questions.map((question) => {
    const options = question.options.map((text) => ({ id: crypto.randomUUID(), text }));
    return {
      id: crypto.randomUUID(),
      prompt: question.prompt,
      options,
      correctOptionId: options[question.correctOption].id,
    };
  });
}

function hideCorrectOptions(questions) {
  return questions.map(({ id, prompt, options }) => ({ id, prompt, options }));
}

function validateAnswers(questions, answers) {
  if (answers.length !== questions.length) {
    const error = new Error("Choose exactly one answer for every question.");
    error.code = "INVALID_ATTEMPT";
    throw error;
  }
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));
  if (answerMap.size !== questions.length || questions.some((question) =>
    !answerMap.has(question.id) || !question.options.some((option) => option.id === answerMap.get(question.id)))) {
    const error = new Error("Choose exactly one valid answer for every question.");
    error.code = "INVALID_ATTEMPT";
    throw error;
  }
  return answerMap;
}

async function createQuiz(faculty, { courseId, title, questions }) {
  const preparedQuestions = makeQuestions(questions);
  const id = crypto.randomUUID();
  if (!db) {
    const overview = await getFacultyOverview(faculty);
    const course = overview.courses.find((item) => String(item.id) === String(courseId));
    if (!course) return null;
    const quiz = {
      id,
      courseId: course.id,
      courseTitle: course.title,
      courseCode: course.code,
      createdBy: faculty.id,
      title,
      questions: preparedQuestions,
      active: true,
      createdAt: new Date().toISOString(),
    };
    localQuizzes.push(quiz);
    return { id, title, courseTitle: course.title, courseCode: course.code, active: true };
  }

  const { rows } = await db.query(
    `INSERT INTO quizzes (id, course_id, created_by, title, questions, active)
     SELECT $1, c.id, $2, $4, $5::jsonb, TRUE
     FROM courses c
     WHERE c.id = $3 AND c.instructor_id = $2 AND c.active = TRUE
     RETURNING id, title`,
    [id, faculty.id, courseId, title, JSON.stringify(preparedQuestions)],
  );
  if (!rows[0]) return null;
  const courseResult = await db.query("SELECT title, course_code AS code FROM courses WHERE id = $1", [courseId]);
  return { ...rows[0], courseTitle: courseResult.rows[0].title, courseCode: courseResult.rows[0].code, active: true };
}

async function listFacultyQuizzes(faculty) {
  if (!db) {
    return localQuizzes
      .filter((quiz) => String(quiz.createdBy) === String(faculty.id))
      .map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        courseTitle: quiz.courseTitle,
        courseCode: quiz.courseCode,
        questionCount: quiz.questions.length,
        attemptCount: Array.from(localAttempts.values()).filter((attempt) => attempt.quizId === quiz.id).length,
        active: quiz.active,
      }));
  }
  const { rows } = await db.query(
    `SELECT q.id, q.title, q.active, jsonb_array_length(q.questions)::int AS question_count,
            c.title AS course_title, c.course_code AS course_code,
            COUNT(a.id)::int AS attempt_count
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id
     LEFT JOIN quiz_attempts a ON a.quiz_id = q.id
     WHERE q.created_by = $1
     GROUP BY q.id, c.id
     ORDER BY q.created_at DESC`,
    [faculty.id],
  );
  return rows.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    courseTitle: quiz.course_title,
    courseCode: quiz.course_code,
    questionCount: quiz.question_count,
    attemptCount: quiz.attempt_count,
    active: quiz.active,
  }));
}

async function listStudentQuizzes(student) {
  if (!db) {
    const completed = new Map(
      Array.from(localAttempts.values())
        .filter((attempt) => String(attempt.studentId) === String(student.id))
        .map((attempt) => [attempt.quizId, attempt]),
    );
    return localQuizzes.filter((quiz) => quiz.active).map((quiz) => {
      const attempt = completed.get(quiz.id);
      return {
        id: quiz.id,
        title: quiz.title,
        courseTitle: quiz.courseTitle,
        courseCode: quiz.courseCode,
        questionCount: quiz.questions.length,
        attempt: attempt ? { score: attempt.score, totalQuestions: attempt.totalQuestions, submittedAt: attempt.submittedAt } : null,
      };
    });
  }
  const { rows } = await db.query(
    `SELECT q.id, q.title, c.title AS course_title, c.course_code AS course_code,
            jsonb_array_length(q.questions)::int AS question_count,
            a.score, a.total_questions, a.submitted_at
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id AND c.active = TRUE
     LEFT JOIN quiz_attempts a ON a.quiz_id = q.id AND a.student_id = $1
     WHERE q.active = TRUE
     ORDER BY q.created_at DESC`,
    [student.id],
  );
  return rows.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    courseTitle: quiz.course_title,
    courseCode: quiz.course_code,
    questionCount: quiz.question_count,
    attempt: quiz.submitted_at
      ? { score: quiz.score, totalQuestions: quiz.total_questions, submittedAt: quiz.submitted_at }
      : null,
  }));
}

async function getQuizForStudent(quizId) {
  if (!db) {
    const quiz = localQuizzes.find((item) => item.id === quizId && item.active);
    if (!quiz) return null;
    return { id: quiz.id, title: quiz.title, questions: hideCorrectOptions(quiz.questions) };
  }
  const { rows } = await db.query(
    `SELECT q.id, q.title, q.questions
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id AND c.active = TRUE
     WHERE q.id = $1 AND q.active = TRUE`,
    [quizId],
  );
  if (!rows[0]) return null;
  return { ...rows[0], questions: hideCorrectOptions(rows[0].questions) };
}

async function submitQuizAttempt(student, quizId, answers) {
  if (!db) {
    const quiz = localQuizzes.find((item) => item.id === quizId && item.active);
    if (!quiz) return null;
    const key = `${quizId}:${student.id}`;
    if (localAttempts.has(key)) {
      const error = new Error("You have already submitted this quiz.");
      error.code = "23505";
      throw error;
    }
    const answerMap = validateAnswers(quiz.questions, answers);
    const score = quiz.questions.reduce((total, question) =>
      total + Number(answerMap.get(question.id) === question.correctOptionId), 0);
    const attempt = {
      quizId,
      studentId: student.id,
      score,
      totalQuestions: quiz.questions.length,
      submittedAt: new Date().toISOString(),
    };
    localAttempts.set(key, attempt);
    return { score, totalQuestions: attempt.totalQuestions, submittedAt: attempt.submittedAt };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT q.questions
       FROM quizzes q JOIN courses c ON c.id = q.course_id
       WHERE q.id = $1 AND q.active = TRUE AND c.active = TRUE
       FOR SHARE OF q`,
      [quizId],
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const questions = rows[0].questions;
    const answerMap = validateAnswers(questions, answers);
    const score = questions.reduce((total, question) =>
      total + Number(answerMap.get(question.id) === question.correctOptionId), 0);
    const result = await client.query(
      `INSERT INTO quiz_attempts (id, quiz_id, student_id, answers, score, total_questions)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING score, total_questions AS "totalQuestions", submitted_at AS "submittedAt"`,
      [crypto.randomUUID(), quizId, student.id, JSON.stringify(answers), score, questions.length],
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createQuiz,
  getQuizForStudent,
  listFacultyQuizzes,
  listStudentQuizzes,
  submitQuizAttempt,
};
