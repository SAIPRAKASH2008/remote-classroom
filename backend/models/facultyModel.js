const { db } = require("../config/database");

const demoCourses = [
  {
    id: 1,
    instructorEmail: "faculty@ruralclass.edu",
    title: "Data Structures & Algorithms",
    code: "CSE201",
    active: true,
    enrolledStudents: 2,
    students: [
      { id: 2, name: "Ananya Rao", email: "student@ruralclass.edu", attendance: 94, progress: 82 },
      { id: 3, name: "Vijay Kumar", email: "student2@ruralclass.edu", attendance: 88, progress: 67 },
    ],
    submissions: [
      { id: 1, title: "Arrays & Linked Lists", studentId: 2, studentName: "Ananya Rao", submittedAt: "2026-10-08T09:15:00.000Z", submissionText: "Implemented singly and doubly linked lists, with insertion, deletion, and search operations. Included complexity notes for each operation.", maxMarks: 20, marks: null, feedback: null },
      { id: 2, title: "Arrays & Linked Lists", studentId: 3, studentName: "Vijay Kumar", submittedAt: "2026-10-08T10:40:00.000Z", submissionText: "Compared array-based and linked-list approaches for insertions and lookups. Added sample traversal and insertion algorithms.", maxMarks: 20, marks: null, feedback: null },
      { id: 3, title: "Complexity & Big-O", studentId: 2, studentName: "Ananya Rao", submittedAt: "2026-10-07T13:05:00.000Z", submissionText: "Classified linear search as O(n), binary search as O(log n), and nested-loop traversal as O(n squared), with examples.", maxMarks: 15, marks: 13, feedback: "Good reasoning. Add a brief note about binary search requiring sorted input." },
    ],
  },
  {
    id: 2,
    instructorEmail: "faculty@ruralclass.edu",
    title: "Fundamentals of Electronics",
    code: "ECE102",
    active: true,
    enrolledStudents: 0,
    students: [],
    submissions: [],
  },
];

async function listAdminCourses(facultyUsers) {
  if (!db) {
    return demoCourses.map((course) => {
      const instructor = facultyUsers.find((faculty) =>
        course.instructorId !== undefined
          ? String(faculty.id) === String(course.instructorId)
          : faculty.email === "faculty@ruralclass.edu");
      return {
        id: course.id,
        title: course.title,
        code: course.code,
        active: course.active,
        instructorId: instructor?.id,
        instructorName: instructor?.name || "Unassigned faculty",
      };
    });
  }
  const { rows } = await db.query(
    `SELECT c.id, c.title, c.course_code AS code, c.active,
            u.id AS instructor_id, u.name AS instructor_name
     FROM courses c
     JOIN users u ON u.id = c.instructor_id
     ORDER BY c.created_at DESC, c.title`,
  );
  return rows.map((course) => ({
    id: course.id,
    title: course.title,
    code: course.code,
    active: course.active,
    instructorId: course.instructor_id,
    instructorName: course.instructor_name,
  }));
}

async function listActiveCoursesForStudents(facultyUsers) {
  if (!db) {
    return demoCourses.filter((course) => course.active).map((course) => {
      const instructor = facultyUsers.find((faculty) =>
        course.instructorId !== undefined
          ? String(faculty.id) === String(course.instructorId)
          : faculty.email === "faculty@ruralclass.edu");
      return {
        id: course.id,
        title: course.title,
        code: course.code,
        instructorName: instructor?.name || "Faculty",
      };
    });
  }
  const { rows } = await db.query(
    `SELECT c.id, c.title, c.course_code AS code, u.name AS instructor_name
     FROM courses c JOIN users u ON u.id = c.instructor_id
     WHERE c.active = TRUE AND u.active = TRUE
     ORDER BY c.title`,
  );
  return rows.map((course) => ({
    id: course.id,
    title: course.title,
    code: course.code,
    instructorName: course.instructor_name,
  }));
}

async function createCourse({ instructorId, code, title, active }, facultyUsers) {
  const instructor = facultyUsers.find((faculty) => String(faculty.id) === String(instructorId));
  if (!instructor) return null;
  if (!db) {
    const duplicate = demoCourses.some((course) =>
      String(course.instructorId ?? facultyUsers.find((faculty) =>
        faculty.email === (course.instructorEmail || "faculty@ruralclass.edu"))?.id ?? "")
        === String(instructor.id)
      && course.code.toLowerCase() === code.toLowerCase());
    if (duplicate) {
      const error = new Error("A course with that code already exists for this faculty member.");
      error.code = "23505";
      throw error;
    }
    const course = {
      id: Math.max(0, ...demoCourses.map((item) => Number(item.id) || 0)) + 1,
      title,
      code,
      active,
      instructorId: instructor.id,
      instructorEmail: instructor.email,
      enrolledStudents: 0,
      students: [],
      submissions: [],
    };
    demoCourses.push(course);
    return { id: course.id, title, code, active, instructorId: instructor.id, instructorName: instructor.name };
  }

  const { rows } = await db.query(
    `INSERT INTO courses (instructor_id, course_code, title, active)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, course_code AS code, active`,
    [instructor.id, code, title, active],
  );
  return { ...rows[0], instructorId: instructor.id, instructorName: instructor.name };
}

async function setCourseActive(courseId, active) {
  if (!db) {
    const course = demoCourses.find((item) => String(item.id) === String(courseId));
    if (!course) return null;
    course.active = active;
    return { id: course.id, active: course.active };
  }
  const { rows } = await db.query(
    "UPDATE courses SET active = $1 WHERE id = $2 RETURNING id, active",
    [active, courseId],
  );
  return rows[0] || null;
}

async function seedDemoFacultyData() {
  if (!db) return;
  const facultyResult = await db.query(
    "SELECT id FROM users WHERE email = $1 AND role = 'faculty' AND active = TRUE LIMIT 1",
    ["faculty@ruralclass.edu"],
  );
  const facultyId = facultyResult.rows[0]?.id;
  if (!facultyId) return;

  const courseIds = new Map();
  for (const course of demoCourses) {
    const result = await db.query(
      `INSERT INTO courses (instructor_id, course_code, title, active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (instructor_id, course_code) DO UPDATE SET title = EXCLUDED.title
       RETURNING id`,
      [facultyId, course.code, course.title],
    );
    courseIds.set(course.code, result.rows[0].id);
  }

  for (const course of demoCourses) {
    const courseId = courseIds.get(course.code);
    if (course.code === "ECE102") {
      await db.query(
        `DELETE FROM enrollments
         WHERE course_id = $1 AND student_id = (
           SELECT id FROM users WHERE email = $2 AND role = 'student'
         )`,
        [courseId, "student@ruralclass.edu"],
      );
    }
    for (const student of course.students) {
      await db.query(
        `INSERT INTO enrollments (course_id, student_id, attendance_percent, progress_percent)
         SELECT $1, id, $3, $4 FROM users WHERE email = $2 AND role = 'student' AND active = TRUE
         ON CONFLICT (course_id, student_id) DO UPDATE
         SET attendance_percent = EXCLUDED.attendance_percent, progress_percent = EXCLUDED.progress_percent`,
        [courseId, student.email, student.attendance, student.progress],
      );
    }
    for (const submission of course.submissions) {
      const assignment = await db.query(
        `INSERT INTO assignments (course_id, title, max_marks)
         VALUES ($1, $2, $3)
         ON CONFLICT (course_id, title) DO UPDATE SET max_marks = EXCLUDED.max_marks
         RETURNING id`,
        [courseId, submission.title, submission.maxMarks],
      );
      await db.query(
        `INSERT INTO submissions (assignment_id, student_id, submission_text, marks, feedback, graded_at)
         SELECT $1, id, $3, $4, $5, CASE WHEN $4 IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END
         FROM users WHERE email = $2 AND role = 'student' AND active = TRUE
         ON CONFLICT (assignment_id, student_id) DO NOTHING`,
        [assignment.rows[0].id, student.email, submission.submissionText, submission.marks, submission.feedback],
      );
    }
  }
}

async function getFacultyOverview(faculty) {
  if (!db) {
    const facultyCourses = demoCourses.filter((course) =>
      course.active && (course.instructorId !== undefined
        ? String(course.instructorId) === String(faculty.id)
        : faculty.email === "faculty@ruralclass.edu"));
    const courses = facultyCourses.map((course) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      active: course.active,
      enrolledStudents: course.enrolledStudents,
    }));
    return {
      courses,
      students: facultyCourses.flatMap((course) => course.students.map((student) => ({
        ...student,
        courseTitle: course.title,
      }))),
      submissions: facultyCourses.flatMap((course) => course.submissions.map((submission) => ({
        ...submission,
        courseId: course.id,
        courseTitle: course.title,
        status: submission.marks === null ? "pending" : "graded",
      }))),
    };
  }

  const [courses, students, submissions] = await Promise.all([
    db.query(
      `SELECT c.id, c.title, c.course_code AS code, c.active,
              COUNT(e.student_id)::int AS enrolled_students
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.instructor_id = $1 AND c.active = TRUE
       GROUP BY c.id
       ORDER BY c.title`,
      [faculty.id],
    ),
    db.query(
      `SELECT DISTINCT u.id, u.name, u.email, e.attendance_percent AS attendance,
              e.progress_percent AS progress, c.title AS course_title
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = e.student_id
       WHERE c.instructor_id = $1
       ORDER BY u.name, c.title`,
      [faculty.id],
    ),
    db.query(
      `SELECT s.id, s.submission_text, s.submitted_at, s.marks, s.feedback, s.graded_at,
              a.title AS assignment_title, a.max_marks, c.id AS course_id,
              c.title AS course_title, u.name AS student_name, u.id AS student_id
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN courses c ON c.id = a.course_id
       JOIN users u ON u.id = s.student_id
       WHERE c.instructor_id = $1
       ORDER BY s.graded_at NULLS FIRST, s.submitted_at DESC`,
      [faculty.id],
    ),
  ]);

  return {
    courses: courses.rows.map((course) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      active: course.active,
      enrolledStudents: course.enrolled_students,
    })),
    students: students.rows.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      attendance: student.attendance,
      progress: student.progress,
      courseTitle: student.course_title,
    })),
    submissions: submissions.rows.map((submission) => ({
      id: submission.id,
      title: submission.assignment_title,
      courseId: submission.course_id,
      courseTitle: submission.course_title,
      studentId: submission.student_id,
      studentName: submission.student_name,
      submissionText: submission.submission_text,
      submittedAt: submission.submitted_at,
      maxMarks: submission.max_marks,
      marks: submission.marks,
      feedback: submission.feedback,
      status: submission.marks === null ? "pending" : "graded",
    })),
  };
}

async function gradeSubmission(faculty, submissionId, marks, feedback) {
  if (!db) {
    if (faculty.email !== "faculty@ruralclass.edu") return null;
    const submission = demoCourses
      .flatMap((course) => course.submissions)
      .find((item) => item.id === Number(submissionId));
    if (!submission) return null;
    submission.marks = marks;
    submission.feedback = feedback;
    return { id: submission.id, marks: submission.marks, feedback: submission.feedback };
  }

  const result = await db.query(
    `UPDATE submissions s
     SET marks = $1, feedback = $2, graded_at = CURRENT_TIMESTAMP
     FROM assignments a, courses c
     WHERE s.id = $3 AND a.id = s.assignment_id AND c.id = a.course_id
       AND c.instructor_id = $4 AND $1 <= a.max_marks
     RETURNING s.id, s.marks, s.feedback`,
    [marks, feedback, submissionId, faculty.id],
  );
  return result.rows[0] || null;
}

async function findSubmissionForFaculty(faculty, submissionId) {
  if (!db) {
    if (faculty.email !== "faculty@ruralclass.edu") return null;
    const submission = demoCourses.flatMap((course) => course.submissions)
      .find((item) => item.id === Number(submissionId));
    return submission ? { ...submission, max_marks: submission.maxMarks } : null;
  }
  const result = await db.query(
    `SELECT s.id, a.max_marks
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE s.id = $1 AND c.instructor_id = $2`,
    [submissionId, faculty.id],
  );
  return result.rows[0] || null;
}

module.exports = {
  createCourse,
  findSubmissionForFaculty,
  getFacultyOverview,
  gradeSubmission,
  listAdminCourses,
  listActiveCoursesForStudents,
  seedDemoFacultyData,
  setCourseActive,
};
