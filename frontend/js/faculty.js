export function facultyDashboard(user, icon, escapeHtml) {
  return `
  <div class="welcome-row">
    <div><p class="eyebrow">FACULTY WORKSPACE</p><h1>Good morning, ${escapeHtml(user.name.split(" ")[0])} <span aria-hidden="true">✦</span></h1><p>Review your courses, enrolled students and submitted work.</p></div>
    <div class="date-pill">${icon("calendar")} Semester 2 · 2026</div>
  </div>
  <section class="stat-grid" aria-label="Teaching overview">
    <article class="stat-card"><div class="stat-card-top"><span>Active courses</span><span class="stat-icon">${icon("book")}</span></div><div class="stat-number" data-faculty-stat="courses">— <small>loading</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Enrolled students</span><span class="stat-icon blue">${icon("users")}</span></div><div class="stat-number" data-faculty-stat="students">— <small>loading</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Submissions</span><span class="stat-icon warm">${icon("file")}</span></div><div class="stat-number" data-faculty-stat="submissions">— <small>submitted</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>To grade</span><span class="stat-icon blue">${icon("check")}</span></div><div class="stat-number" data-faculty-stat="pending">— <small>awaiting marks</small></div></article>
  </section>
  <section class="faculty-banner">
    <div><h2>Ready for your next class?</h2><p>Your students can join your live classroom.</p></div>
    <button class="button" data-action="start-live">${icon("play")} Start live class</button>
  </section>
  <section class="panel faculty-panel" id="faculty-courses">
    <div class="panel-heading"><h2>Active courses</h2><button class="panel-action" data-action="refresh-faculty">Refresh data</button></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Course</th><th>Code</th><th>Enrolled</th><th>Status</th></tr></thead><tbody id="faculty-course-rows"><tr><td colspan="4">Loading courses…</td></tr></tbody></table></div>
  </section>
  <section class="panel faculty-panel" id="faculty-students">
    <div class="panel-heading"><h2>Enrolled students</h2><span class="faculty-section-note">Enrollment and progress by course</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Email</th><th>Course</th><th>Attendance</th><th>Progress</th></tr></thead><tbody id="faculty-student-rows"><tr><td colspan="5">Loading enrolled students…</td></tr></tbody></table></div>
  </section>
  <section class="panel faculty-panel" id="faculty-submissions">
    <div class="panel-heading"><div><h2>Submissions and marks</h2><p class="faculty-section-note">Review each answer, enter a score and feedback, then submit the marks.</p></div></div>
    <div class="table-wrap"><table class="data-table faculty-submission-table"><thead><tr><th>Student and course</th><th>Assignment response</th><th>Marks</th><th>Feedback</th><th>Action</th></tr></thead><tbody id="faculty-submission-rows"><tr><td colspan="5">Loading submissions…</td></tr></tbody></table></div>
  </section>
  <section class="panel faculty-panel">
    <div class="panel-heading"><div><h2>Quizzes</h2><p class="faculty-section-note">Create multiple-choice quizzes for students in your active courses.</p></div><button class="button button-primary" data-action="create-quiz">Create a quiz</button></div>
    <div id="faculty-quiz-list"><p class="faculty-section-note">Loading quizzes…</p></div>
  </section>
  <section class="panel faculty-panel">
    <div class="panel-heading"><div><h2>Class recordings</h2><p class="faculty-section-note">Saved sessions can be downloaded for offline viewing.</p></div><button class="panel-action" data-action="refresh-recordings">Refresh</button></div>
    <div id="class-recordings"><p class="faculty-section-note">Loading recordings…</p></div>
  </section>
  <section class="panel faculty-panel">
    <div class="panel-heading"><h2>Upcoming classes</h2><button class="panel-action" data-action="notify">View calendar</button></div>
    <div class="faculty-session"><div class="session-date"><strong>09</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Data Structures &amp; Algorithms</strong><span>10:30 AM · Live · Join from your dashboard</span></div>${icon("play")}</div>
    <div class="faculty-session"><div class="session-date"><strong>10</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Fundamentals of Electronics</strong><span>09:00 AM · Recorded session</span></div>${icon("play")}</div>
  </section>`;
}

function renderCourses(courses, escapeHtml) {
  const body = document.querySelector("#faculty-course-rows");
  if (!body) return;
  body.innerHTML = courses.length
    ? courses.map((course) => `<tr><td>${escapeHtml(course.title)}</td><td>${escapeHtml(course.code)}</td><td>${course.enrolledStudents}</td><td><span class="faculty-active-status">Active</span></td></tr>`).join("")
    : `<tr><td colspan="4">No active courses are assigned to your account yet.</td></tr>`;
}

function renderStudents(students, escapeHtml) {
  const body = document.querySelector("#faculty-student-rows");
  if (!body) return;
  body.innerHTML = students.length
    ? students.map((student) => `<tr><td>${escapeHtml(student.name)}</td><td>${escapeHtml(student.email)}</td><td>${escapeHtml(student.courseTitle)}</td><td>${student.attendance}%</td><td>${student.progress}%</td></tr>`).join("")
    : `<tr><td colspan="5">No students are enrolled in your courses yet.</td></tr>`;
}

function renderSubmissions(submissions, escapeHtml) {
  const body = document.querySelector("#faculty-submission-rows");
  if (!body) return;
  body.innerHTML = submissions.length
    ? submissions.map((submission) => {
      const graded = submission.marks !== null && submission.marks !== undefined;
      const response = escapeHtml(submission.submissionText);
      const feedback = escapeHtml(submission.feedback || "");
      return `<tr>
        <td><strong>${escapeHtml(submission.studentName)}</strong><span class="faculty-table-secondary">${escapeHtml(submission.courseTitle)} · ${escapeHtml(submission.title)}</span></td>
        <td><details class="submission-response"><summary>${escapeHtml(submission.title)} · ${new Date(submission.submittedAt).toLocaleDateString()}</summary><p>${response}</p></details></td>
        <td>
          <label class="visually-hidden" for="marks-${submission.id}">Marks out of ${submission.maxMarks}</label>
          <input id="marks-${submission.id}" form="grade-form-${submission.id}" name="marks" type="number" min="0" max="${submission.maxMarks}" step="0.01" value="${graded ? submission.marks : ""}" placeholder="0–${submission.maxMarks}" required />
          <span class="faculty-table-secondary">out of ${submission.maxMarks}</span>
        </td>
        <td><label class="visually-hidden" for="feedback-${submission.id}">Feedback for ${escapeHtml(submission.studentName)}</label><textarea id="feedback-${submission.id}" class="grade-feedback" form="grade-form-${submission.id}" name="feedback" maxlength="2000" placeholder="Optional feedback">${feedback}</textarea></td>
        <td><button class="button button-primary grade-submit" type="submit" form="grade-form-${submission.id}" data-submission-id="${submission.id}">${graded ? "Update marks" : "Submit marks"}</button><span class="grade-status">${graded ? `Submitted: ${submission.marks} / ${submission.maxMarks}` : "Awaiting marks"}</span>
          <form id="grade-form-${submission.id}" class="grade-form" data-submission-id="${submission.id}" data-max-marks="${submission.maxMarks}"></form>
        </td>
      </tr>`;
    }).join("")
    : `<tr><td colspan="5">No submissions to review yet.</td></tr>`;
}

export async function loadFacultyOverview(apiRequest, escapeHtml) {
  try {
    const { overview } = await apiRequest("/api/faculty/overview");
    renderCourses(overview.courses, escapeHtml);
    renderStudents(overview.students, escapeHtml);
    renderSubmissions(overview.submissions, escapeHtml);
    const uniqueStudentCount = new Set(overview.students.map((student) => student.id)).size;
    const pendingCount = overview.submissions.filter((submission) => submission.marks === null || submission.marks === undefined).length;
    const values = {
      courses: `${overview.courses.length} <small>active</small>`,
      students: `${uniqueStudentCount} <small>enrolled</small>`,
      submissions: `${overview.submissions.length} <small>received</small>`,
      pending: `${pendingCount} <small>awaiting marks</small>`,
    };
    for (const [key, value] of Object.entries(values)) {
      const target = document.querySelector(`[data-faculty-stat="${key}"]`);
      if (target) target.innerHTML = value;
    }
  } catch (error) {
    for (const [selector, columns] of [["#faculty-course-rows", 4], ["#faculty-student-rows", 5], ["#faculty-submission-rows", 5]]) {
      const body = document.querySelector(selector);
      if (body) body.innerHTML = `<tr><td colspan="${columns}">${escapeHtml(error.message)}</td></tr>`;
    }
    console.error("Could not load faculty course data:", error);
  }
}
