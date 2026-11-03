export function studentDashboard(user, icon, escapeHtml) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(now);
  const semester = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(now);
  return `
  <div class="welcome-row">
    <div><p class="eyebrow">${escapeHtml(today)}</p><h1>${greeting}, ${escapeHtml(user.name.split(" ")[0])} <span aria-hidden="true">✦</span></h1><p>Here's what your learning day looks like.</p></div>
    <div class="date-pill">${icon("calendar")} ${escapeHtml(semester)}</div>
  </div>
  <section class="stat-grid" aria-label="Your learning at a glance">
    <article class="stat-card"><div class="stat-card-top"><span>Active courses</span><span class="stat-icon">${icon("book")}</span></div><div class="stat-number" data-student-course-count>— <small>loading</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Lessons completed</span><span class="stat-icon blue">${icon("check")}</span></div><div class="stat-number" data-student-lessons-completed>0 <small>completed</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Overall progress</span><span class="stat-icon warm">${icon("chart")}</span></div><div class="stat-number" data-student-overall-progress>0<small>%</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Lessons available</span><span class="stat-icon">${icon("book")}</span></div><div class="stat-number" data-student-lesson-count>— <small>loading</small></div></article>
  </section>
  <div class="student-content-grid">
    <div class="content-column">
      <section class="panel">
        <div class="panel-heading"><h2>Up next in your classroom</h2><button class="panel-action" data-action="open-live">View schedule</button></div>
        <article class="live-class-card">
          <div class="live-card-content" id="student-next-class"><p>Loading your next class…</p></div>
        </article>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Continue learning</h2><button class="panel-action" data-action="nav" data-target="courses">All courses →</button></div>
        <div class="course-list" id="student-courses"><p class="faculty-section-note">Loading courses…</p></div>
      </section>
      <section class="panel" id="student-quizzes">
        <div class="panel-heading"><div><h2>Quizzes</h2><p class="faculty-section-note">Attempt a quiz once and see your score immediately.</p></div><button class="panel-action" data-action="refresh-quizzes">Refresh</button></div>
        <div id="student-quiz-list"><p class="faculty-section-note">Loading quizzes…</p></div>
      </section>
      <section class="panel">
        <div class="panel-heading"><div><h2>Class recordings</h2><p class="faculty-section-note">Download a recording to watch it offline.</p></div><button class="panel-action" data-action="refresh-recordings">Refresh</button></div>
        <div id="class-recordings"><p class="faculty-section-note">Loading recordings…</p></div>
      </section>
    </div>
    <div class="content-column">
      <section class="panel">
        <div class="panel-heading"><div><h2>Today's schedule</h2><p class="faculty-section-note" id="student-schedule-date"></p></div><button class="panel-action" data-action="view-student-timetable">Full week</button></div>
        <div class="schedule-list" id="student-schedule"><p class="faculty-section-note">Loading today's schedule…</p></div>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Quiz progress</h2><button class="panel-action" data-action="nav" data-target="quizzes">View quizzes</button></div>
        <div class="offline-card"><span class="offline-icon">${icon("check")}</span><div><strong>One attempt per quiz</strong><p>Your score appears as soon as you submit your answers.</p></div></div>
      </section>
      <div class="offline-card"><span class="offline-icon">${icon("check")}</span><div><strong>Your progress is saved</strong><p>Completed lessons and your place in each course are saved on this device.</p></div></div>
    </div>
  </div>`;
}
