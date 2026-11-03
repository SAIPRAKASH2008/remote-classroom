import { apiRequest } from "./auth.js";
import {
  adminCoursesPanel,
  adminDashboard as renderAdminDashboard,
  loadAdminCourses as refreshAdminCourses,
  loadAdminUsers as refreshAdminUsers,
} from "./admin.js";
import { facultyDashboard as renderFacultyDashboard, loadFacultyOverview } from "./faculty.js";
import { joinLiveClass, leaveLiveClass } from "./liveClass.js";
import { loadRecordings } from "./recordings.js";
import { loadFacultyQuizzes, loadStudentQuizzes } from "./quizzes.js";
import { studentDashboard as renderStudentDashboard } from "./student.js";
import {
  completeStudentLesson,
  getNextStudentLessonId,
  loadStudentCourses,
  loadStudentSchedule,
  studentCourseContent,
  studentLessonContent,
  studentTimetableContent,
} from "./studentLearning.js";

const icons = {
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8M8 11h8"/>',
  play: '<path d="m9 6 10 6-10 6z"/>',
  wifi: '<path d="M5 9.5a11 11 0 0 1 14 0"/><path d="M8 12.5a6.5 6.5 0 0 1 8 0"/><path d="M11 15.5a2 2 0 0 1 2 0"/><path d="M12 19h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  logOut: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  zap: '<path d="m13 2-3 8h7l-6 12 1-9H5z"/>',
  headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M5 14h2v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM19 14h-2v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="m8.2 13-1 9 4.8-3 4.8 3-1-9"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
};

const icon = (name, className = "icon") =>
  `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;

const app = document.getElementById("app");
let activeRole = "student";
let toastTimer;
let currentUser = null;
let demoStudentCredentials = [];

const landingPage = () => `
  <div class="landing">
    <header class="site-header">
      <a class="brand" href="#" aria-label="Remote Classrooms home">
        <span class="brand-mark">${icon("book")}</span>
        <span>remote classrooms</span>
      </a>
      <nav class="site-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#our-impact">Our impact</a>
        <button class="button button-primary button-small" data-action="open-login" data-role="student">
          Student sign in <span aria-hidden="true">→</span>
        </button>
      </nav>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow"><span class="eyebrow-dot"></span> DIGITAL INCLUSION FOR EVERY CAMPUS</p>
          <h1>Great teachers.<br /><span>No matter the distance.</span></h1>
          <p class="hero-description">
            Bringing live classes, expert faculty and learning resources to rural colleges —
            designed for real connections, even when the internet isn't.
          </p>
          <div class="hero-actions">
            <button class="button button-primary" data-action="open-login" data-role="student">
              Explore as a student ${icon("play")}
            </button>
            <button class="button button-quiet" data-action="open-login" data-role="faculty">
              Faculty portal <span aria-hidden="true">→</span>
            </button>
          </div>
          <div class="hero-proof">
            <div class="avatar-stack" aria-hidden="true">
              <span class="avatar">AR</span><span class="avatar orange-avatar">MS</span><span class="avatar">SK</span><span class="avatar orange-avatar">+</span>
            </div>
            <div class="proof-copy"><strong>Learning without limits</strong>Made for students, teachers &amp; rural campuses</div>
          </div>
        </div>
        <div class="hero-visual" aria-label="Preview of the student learning dashboard">
          <div class="hero-orbit"></div>
          <div class="dashboard-preview">
            <div class="preview-topbar"><span></span><span></span><span></span></div>
            <div class="preview-layout">
              <div class="preview-sidebar">
                <div class="preview-brand"></div>
                <div class="preview-nav active"></div>
                <div class="preview-nav"></div>
                <div class="preview-nav"></div>
                <div class="preview-nav"></div>
              </div>
              <div class="preview-main">
                <div class="preview-greeting"></div>
                <div class="preview-subtitle"></div>
                <div class="preview-live">
                  <div class="preview-live-info">
                    <div class="preview-live-tag">TODAY · 10:30 AM</div>
                    <p class="preview-live-title">A live class, wherever you are.</p>
                  </div>
                </div>
                <div class="preview-cards">
                  <div class="preview-card"><div class="preview-card-top"></div><div class="preview-line"></div><div class="preview-line short"></div></div>
                  <div class="preview-card"><div class="preview-card-top"></div><div class="preview-line"></div><div class="preview-line short"></div></div>
                </div>
              </div>
            </div>
          </div>
          <div class="floating-note note-offline">
            <span class="icon-box">${icon("wifi")}</span>
            <span><strong>Works offline, too</strong>Pick up where you left off</span>
          </div>
          <div class="floating-note note-campus">
            <span class="icon-box">${icon("globe")}</span>
            <span><strong>Learning in your language</strong>Made for every learner</span>
          </div>
        </div>
      </section>
      <section class="impact-strip" id="our-impact" aria-label="Project goals">
        <div class="impact-item"><div class="impact-number">40+</div><div class="impact-label">rural colleges to connect</div></div>
        <div class="impact-item"><div class="impact-number">25,000</div><div class="impact-label">students to reach</div></div>
        <div class="impact-item"><div class="impact-number">10+</div><div class="impact-label">regional languages</div></div>
        <div class="impact-item"><div class="impact-number">100 kbps</div><div class="impact-label">built for low bandwidth</div></div>
      </section>
      <section class="features-section" id="how-it-works">
        <p class="section-eyebrow">A classroom without borders</p>
        <h2 class="section-title">Learning that meets you where you are.</h2>
        <p class="section-intro">Thoughtful technology connects students and expert faculty, while keeping learning accessible through patchy networks and busy days.</p>
        <div class="feature-grid">
          <article class="feature-card">
            <span class="feature-icon">${icon("play")}</span>
            <h3>Live &amp; recorded classes</h3>
            <p>Join live sessions or catch up with recorded lectures, with quality that adapts to your connection.</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon orange">${icon("wifi")}</span>
            <h3>Offline-first learning</h3>
            <p>Download lessons, keep studying without a signal, and sync your progress when you're back online.</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon blue">${icon("globe")}</span>
            <h3>Made for every learner</h3>
            <p>Choose regional-language captions, simple course tools and a comfortable learning pace.</p>
          </article>
        </div>
      </section>
    </main>
    <footer class="site-footer">Remote Classrooms · Digital Inclusion Initiative · Student project demo</footer>
  </div>`;

const loginPage = (role = "student") => {
  activeRole = role;
  const roleLabels = { student: "Student", faculty: "Faculty", admin: "Admin" };
  const roleLabel = roleLabels[role] || roleLabels.student;
  return `
    <main class="auth-page">
      <section class="auth-main">
        <div class="auth-card">
          <a class="brand mobile-brand" href="#" data-action="home">
            <span class="brand-mark">${icon("book")}</span><span>remote classrooms</span>
          </a>
          <h1 class="auth-title">Sign in</h1>
          <p class="auth-subtitle">Choose your account type to continue.</p>
          <div class="role-switch" aria-label="Choose account type">
            <button class="role-option ${role === "student" ? "active" : ""}" data-action="switch-role" data-role="student" aria-pressed="${role === "student"}">Student</button>
            <button class="role-option ${role === "faculty" ? "active" : ""}" data-action="switch-role" data-role="faculty" aria-pressed="${role === "faculty"}">Faculty</button>
            <button class="role-option ${role === "admin" ? "active" : ""}" data-action="switch-role" data-role="admin" aria-pressed="${role === "admin"}">Admin</button>
          </div>
          <form id="login-form" data-role="${role}">
            <div class="form-field">
              <label for="email">Email address</label>
              <div class="input-wrap">${icon("mail")}<input id="email" name="email" type="email" autocomplete="username" placeholder="you@college.edu" required /></div>
            </div>
            <div class="form-field">
              <label for="password">Password</label>
              <div class="input-wrap">${icon("lock")}<input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required /><button class="password-toggle" type="button" data-action="toggle-password">Show</button></div>
            </div>
            <button class="button button-primary auth-submit" type="submit">Sign in as ${roleLabel} <span aria-hidden="true">→</span></button>
            <p class="form-error" id="form-error" role="status" aria-live="polite"></p>
          </form>
          <p class="login-note">Use the email and password provided by your campus administrator.</p>
          <details class="demo-account-panel" id="demo-accounts" hidden>
            <summary>Show development demo accounts</summary>
            <div class="demo-account-list"></div>
          </details>
        </div>
      </section>
    </main>`;
};

const sidebar = (role, user) => {
  const studentLinks = [
    ["grid", "Overview", "overview"],
    ["book", "My courses", "courses"],
    ["check", "Quizzes", "quizzes"],
    ["message", "Messages", "messages"],
  ];
  const facultyLinks = [
    ["grid", "Overview", "overview"],
    ["book", "Active courses", "courses"],
    ["users", "Students", "students"],
    ["file", "Submissions", "assessments"],
  ];
  const adminLinks = [
    ["grid", "Overview", "overview"],
    ["users", "User accounts", "users"],
  ];
  const links = role === "student" ? studentLinks : role === "admin" ? adminLinks : facultyLinks;
  const initials = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return `
    <aside class="sidebar">
      <a class="brand" href="#" data-action="home"><span class="brand-mark">${icon("book")}</span><span>remote classrooms</span></a>
      <div class="sidebar-section-label">Learning space</div>
      <nav class="side-nav" aria-label="Dashboard navigation">
        ${links.map(([symbol, label, key], i) => `<button class="side-link ${i === 0 ? "active" : ""}" data-action="nav" data-target="${key}">${icon(symbol)}<span>${label}</span></button>`).join("")}
      </nav>
      <div class="sidebar-spacer"></div>
      <div class="connectivity-card">
        <div class="connectivity-top"><span class="status-dot"></span>You're connected</div>
        <p>Lessons stay ready, even when your connection takes a break.</p>
      </div>
      <div class="profile-row">
        <span class="avatar ${role === "faculty" ? "orange-avatar" : ""}">${initials}</span>
        <div class="profile-info"><strong>${escapeHtml(user.name)}</strong><span>${role === "student" ? "Student · Year 2" : role === "admin" ? "Administrator" : "Faculty · Computer Science"}</span></div>
        <button class="logout-button" data-action="logout" aria-label="Sign out">${icon("logOut")}</button>
      </div>
    </aside>`;
};

const topbar = (role) => `
  <header class="dashboard-topbar">
    <div class="breadcrumb">Learning space <span aria-hidden="true">/</span> <strong>${role === "student" ? "Student dashboard" : role === "admin" ? "Admin dashboard" : "Faculty dashboard"}</strong></div>
    <div class="topbar-right">
      <select class="language-select" aria-label="Choose language" data-action="language">
        <option>English</option><option>తెలుగు</option><option>हिन्दी</option><option>தமிழ்</option>
      </select>
      <button class="notification-button" data-action="notify" aria-label="Notifications">${icon("bell")}</button>
    </div>
  </header>`;

const legacyStudentDashboard = (user) => `
  <div class="welcome-row">
    <div><p class="eyebrow">WEDNESDAY, 7 OCTOBER</p><h1>Good morning, ${escapeHtml(user.name.split(" ")[0])} <span aria-hidden="true">✦</span></h1><p>Here's what your learning day looks like.</p></div>
    <div class="date-pill">${icon("calendar")} Semester 2 · 2026</div>
  </div>
  <section class="stat-grid" aria-label="Your learning at a glance">
    <article class="stat-card"><div class="stat-card-top"><span>Enrolled courses</span><span class="stat-icon">${icon("book")}</span></div><div class="stat-number">04 <small>this semester</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Classes attended</span><span class="stat-icon blue">${icon("users")}</span></div><div class="stat-number">18 <span class="stat-trend">↑ 2 this week</span></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Average score</span><span class="stat-icon warm">${icon("award")}</span></div><div class="stat-number">86<small>%</small><span class="stat-trend">On track</span></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Lessons saved</span><span class="stat-icon">${icon("wifi")}</span></div><div class="stat-number">06 <small>ready offline</small></div></article>
  </section>
  <div class="student-content-grid">
    <div class="content-column">
      <section class="panel">
        <div class="panel-heading"><h2>Up next in your classroom</h2><button class="panel-action" data-action="open-live">View schedule</button></div>
        <article class="live-class-card">
          <div class="live-card-content">
            <span class="live-label"><span></span> NEXT CLASS · 10:30 AM</span>
            <h3>Data Structures &amp; Algorithms</h3>
            <p>with Dr. Meera Sharma · Live classroom</p>
            <button class="button live-join" data-action="open-live">${icon("play")} Join class</button>
          </div>
        </article>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Continue learning</h2><button class="panel-action" data-action="nav" data-target="courses">All courses →</button></div>
        <div class="course-list">
          <div class="course-row"><span class="course-art">${icon("chart")}</span><div class="course-details"><strong>Data Structures &amp; Algorithms</strong><span>Dr. Meera Sharma · 12 lessons</span></div><div class="course-progress"><div class="progress-label">72%</div><div class="progress-track"><div class="progress-fill" style="width:72%"></div></div></div></div>
          <div class="course-row"><span class="course-art orange">${icon("zap")}</span><div class="course-details"><strong>Fundamentals of Electronics</strong><span>Prof. Arjun Reddy · 8 lessons</span></div><div class="course-progress"><div class="progress-label">48%</div><div class="progress-track"><div class="progress-fill orange" style="width:48%"></div></div></div></div>
          <div class="course-row"><span class="course-art blue">${icon("globe")}</span><div class="course-details"><strong>Communication Skills</strong><span>Dr. Kavya Rao · 10 lessons</span></div><div class="course-progress"><div class="progress-label">35%</div><div class="progress-track"><div class="progress-fill blue" style="width:35%"></div></div></div></div>
        </div>
      </section>
    </div>
    <div class="content-column">
      <section class="panel">
        <div class="panel-heading"><h2>Today's schedule</h2><button class="panel-action" data-action="notify">Full week</button></div>
        <div class="schedule-list">
          <div class="schedule-item"><div class="schedule-time">10:30 AM</div><div class="schedule-details"><strong>Data Structures</strong><span>Live · 45 min</span></div></div>
          <div class="schedule-item"><div class="schedule-time">01:00 PM</div><div class="schedule-details warm-border"><strong>Electronics II</strong><span>Recorded · 35 min</span></div></div>
          <div class="schedule-item"><div class="schedule-time">03:15 PM</div><div class="schedule-details"><strong>Study group</strong><span>Campus room · 1 hour</span></div></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>Quiz deadlines</h2><button class="panel-action" data-action="nav" data-target="quizzes">See all</button></div>
        <div class="quiz-item"><div class="quiz-name"><strong>Arrays &amp; Linked Lists</strong><span>Data Structures</span></div><span class="quiz-due">Due tomorrow</span></div>
        <div class="quiz-item"><div class="quiz-name"><strong>Basic Circuit Analysis</strong><span>Electronics II</span></div><span class="quiz-due">In 3 days</span></div>
        <div class="quiz-item"><div class="quiz-name"><strong>Introduction quiz</strong><span>Communication Skills</span></div><span class="quiz-due completed">Completed</span></div>
      </section>
      <div class="offline-card"><span class="offline-icon">${icon("wifi")}</span><div><strong>Your learning goes offline</strong><p>6 lessons are downloaded and ready whenever you need them.</p></div></div>
    </div>
  </div>`;

const legacyFacultyDashboard = (user) => `
  <div class="welcome-row">
    <div><p class="eyebrow">WEDNESDAY, 7 OCTOBER</p><h1>Good morning, ${escapeHtml(user.name.split(" ")[0])} <span aria-hidden="true">✦</span></h1><p>Your teaching space is ready. Here's your class at a glance.</p></div>
    <div class="date-pill">${icon("calendar")} Semester 2 · 2026</div>
  </div>
  <section class="stat-grid" aria-label="Teaching overview">
    <article class="stat-card"><div class="stat-card-top"><span>Active courses</span><span class="stat-icon">${icon("book")}</span></div><div class="stat-number">04 <small>this semester</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Enrolled students</span><span class="stat-icon blue">${icon("users")}</span></div><div class="stat-number">128 <span class="stat-trend">Across 3 campuses</span></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>Classes this week</span><span class="stat-icon warm">${icon("calendar")}</span></div><div class="stat-number">12 <small>2 remaining</small></div></article>
    <article class="stat-card"><div class="stat-card-top"><span>To review</span><span class="stat-icon blue">${icon("file")}</span></div><div class="stat-number">08 <small>submissions</small></div></article>
  </section>
  <section class="faculty-banner">
    <div><h2>Ready for your next class?</h2><p>Data Structures &amp; Algorithms · 32 students enrolled</p></div>
    <button class="button" data-action="start-live">${icon("play")} Start live class</button>
  </section>
  <div class="faculty-dashboard-grid">
    <section class="panel">
      <div class="panel-heading"><h2>Student progress</h2><button class="panel-action" data-action="nav" data-target="students">View all students →</button></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Student</th><th>Course progress</th><th>Attendance</th><th>Last active</th></tr></thead>
          <tbody>
            <tr><td><span class="table-person"><span class="avatar">AR</span>Ananya Rao</span></td><td><span class="completion-bar"><span style="width:82%"></span></span>82%</td><td>94%</td><td>Today</td></tr>
            <tr><td><span class="table-person"><span class="avatar orange-avatar">VK</span>Vijay Kumar</span></td><td><span class="completion-bar"><span style="width:67%"></span></span>67%</td><td>88%</td><td>Today</td></tr>
            <tr><td><span class="table-person"><span class="avatar">SP</span>Sana Parveen</span></td><td><span class="completion-bar"><span style="width:54%"></span></span>54%</td><td>91%</td><td>Yesterday</td></tr>
            <tr><td><span class="table-person"><span class="avatar orange-avatar">RK</span>Ravi Kumar</span></td><td><span class="completion-bar"><span style="width:39%"></span></span>39%</td><td>72%</td><td>2 days ago</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <div class="panel-heading"><h2>Upcoming classes</h2><button class="panel-action" data-action="notify">View calendar</button></div>
      <div class="faculty-session"><div class="session-date"><strong>07</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Data Structures</strong><span>10:30 AM · Live · 32 students</span></div>${icon("play")}</div>
      <div class="faculty-session"><div class="session-date"><strong>08</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Algorithms II</strong><span>09:00 AM · Live · 28 students</span></div>${icon("play")}</div>
      <div class="faculty-session"><div class="session-date"><strong>09</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Data Structures</strong><span>11:00 AM · Live · 32 students</span></div>${icon("play")}</div>
    </section>
  </div>
  <div class="dashboard-secondary">
    <section class="panel">
      <div class="panel-heading"><h2>Assessment queue</h2><button class="panel-action" data-action="nav" data-target="assessments">Manage assessments →</button></div>
      <div class="quiz-item"><div class="quiz-name"><strong>Arrays &amp; Linked Lists</strong><span>Data Structures · 32 submissions</span></div><span class="quiz-due">5 to review</span></div>
      <div class="quiz-item"><div class="quiz-name"><strong>Complexity &amp; Big-O</strong><span>Algorithms II · 28 submissions</span></div><span class="quiz-due">3 to review</span></div>
    </section>
    <section class="panel">
      <div class="panel-heading"><h2>Campus connection</h2>${icon("wifi")}</div>
      <div class="offline-card"><span class="offline-icon">${icon("sun")}</span><div><strong>All campuses online</strong><p>Last sync 4 minutes ago · Low-bandwidth stream ready</p></div></div>
    </section>
  </div>`;

function dashboardPage(user) {
  const role = user.role;
  return `<div class="dashboard">
    ${sidebar(role, user)}
    <main class="dashboard-main">
      ${topbar(role)}
      ${role === "student" ? renderStudentDashboard(user, icon, escapeHtml) : role === "admin" ? `${renderAdminDashboard(user, escapeHtml)}${adminCoursesPanel()}` : renderFacultyDashboard(user, icon, escapeHtml)}
      <footer class="site-footer">Remote Classrooms · Your learning space</footer>
    </main>
  </div>`;
}

function legacyAdminDashboard(user) {
  return `
    <div class="welcome-row">
      <div><p class="eyebrow">CAMPUS ADMINISTRATION</p><h1>Welcome, ${escapeHtml(user.name.split(" ")[0])}</h1><p>Manage student, faculty and administrator accounts.</p></div>
    </div>
    <section class="panel admin-panel">
      <div class="panel-heading"><h2>Create an account</h2></div>
      <form id="admin-user-form" class="admin-user-form">
        <div class="form-field"><label for="new-user-name">Full name</label><input id="new-user-name" name="name" required minlength="2" maxlength="120" /></div>
        <div class="form-field"><label for="new-user-email">Email address</label><input id="new-user-email" name="email" type="email" required /></div>
        <div class="form-field"><label for="new-user-role">Account type</label><select id="new-user-role" name="role" required><option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option></select></div>
        <div class="form-field"><label for="new-user-password">Temporary password</label><input id="new-user-password" name="password" type="password" minlength="8" required /></div>
        <button class="button button-primary" type="submit">Create account</button>
        <p class="form-error" id="admin-form-error" role="status" aria-live="polite"></p>
      </form>
    </section>
    <section class="panel admin-panel">
      <div class="panel-heading"><h2>Accounts</h2><button class="panel-action" data-action="refresh-users">Refresh</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody id="admin-users"><tr><td colspan="4">Loading accounts…</td></tr></tbody></table></div>
    </section>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

async function legacyApiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(result?.error || "The request could not be completed.");
  return result;
}

async function legacyLoadAdminUsers() {
  const tableBody = document.querySelector("#admin-users");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="4">Loading accounts…</td></tr>`;
  try {
    const { users } = await apiRequest("/api/admin/users");
    tableBody.innerHTML = users.length
      ? users.map((user) => `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.role)}</td><td>${user.active ? "Active" : "Disabled"}</td></tr>`).join("")
      : `<tr><td colspan="4">No accounts have been created yet.</td></tr>`;
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function render() {
  showLogin();
  try {
    const { user } = await apiRequest("/api/auth/me");
    if (!user) return;
    currentUser = user;
    app.innerHTML = dashboardPage(user);
    loadDashboardData(user);
  } catch (error) {
    const formError = document.querySelector("#form-error");
    if (formError) formError.textContent = "Could not connect to the website server. Please try again.";
    console.error("Could not restore the sign-in session:", error);
  }
}

function loadDashboardData(user) {
  if (user.role === "admin") {
    refreshAdminUsers(apiRequest, escapeHtml);
    refreshAdminCourses(apiRequest, escapeHtml);
  } else if (user.role === "faculty") {
    loadFacultyOverview(apiRequest, escapeHtml);
    loadFacultyQuizzes(apiRequest, escapeHtml);
    loadRecordings(apiRequest, escapeHtml);
  } else if (user.role === "student") {
    loadStudentCourses(apiRequest, escapeHtml, user);
    loadStudentSchedule(apiRequest, escapeHtml);
    loadStudentQuizzes(apiRequest, escapeHtml);
    loadRecordings(apiRequest, escapeHtml);
  }
}

function showDemoAccounts(accounts) {
  const details = document.querySelector("#demo-accounts");
  const list = details?.querySelector(".demo-account-list");
  if (!details || !list || !accounts.length) return;
  for (const account of accounts) {
    const item = document.createElement("p");
    item.textContent = `${account.role === "faculty" ? "Faculty" : "Student"}: ${account.email} · ${account.password}`;
    list.appendChild(item);
  }
  details.hidden = false;
}

async function loadDemoAccounts() {
  try {
    const { accounts } = await apiRequest("/api/demo-accounts");
    showDemoAccounts(accounts);
  } catch (error) {
    console.error("Could not load development demo accounts:", error);
  }
}

function showLogin(role = "student") {
  currentUser = null;
  app.innerHTML = loginPage(role);
  loadDemoAccounts();
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.appendChild(toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.remove(), 3200);
}

function showModal(title, subtitle, content, buttonText = "Got it", modalClass = "") {
  document.querySelector(".modal-backdrop")?.remove();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<section class="modal ${escapeHtml(modalClass)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
    <div class="modal-top"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">${icon("close")}</button></div>
    ${content}
    <button class="button button-primary" data-action="close-modal">${escapeHtml(buttonText)}</button>
  </section>`;
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
  document.body.appendChild(backdrop);
  backdrop.querySelector(".modal-close").focus();
}

function quizQuestionEditor(index) {
  const options = [1, 2, 3, 4].map((number) =>
    `<div class="form-field"><label for="quiz-${index}-option-${number}">Choice ${number}</label><input id="quiz-${index}-option-${number}" name="option" maxlength="240" required /></div>`).join("");
  return `<fieldset class="quiz-question-editor">
    <legend>Question ${index + 1}</legend>
    <div class="form-field"><label for="quiz-${index}-prompt">Question</label><textarea id="quiz-${index}-prompt" name="prompt" maxlength="1000" required></textarea></div>
    <div class="quiz-option-grid">${options}</div>
    <div class="form-field"><label for="quiz-${index}-correct">Correct choice</label><select id="quiz-${index}-correct" name="correctOption">${[1, 2, 3, 4].map((number) => `<option value="${number - 1}">Choice ${number}</option>`).join("")}</select></div>
    ${index > 0 ? `<button type="button" class="panel-action" data-action="remove-quiz-question">Remove question</button>` : ""}
  </fieldset>`;
}

async function openQuizBuilder() {
  try {
    const { courses } = await apiRequest("/api/faculty/quizzes");
    if (!courses.length) {
      showToast("Create or activate a course before adding a quiz.");
      return;
    }
    const courseOptions = courses.map((course) =>
      `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)} · ${escapeHtml(course.code)}</option>`).join("");
    showModal(
      "Create a quiz",
      "Students can submit one attempt and see their score immediately.",
      `<form id="faculty-quiz-form">
        <div class="form-field"><label for="quiz-title">Quiz title</label><input id="quiz-title" name="title" maxlength="160" required /></div>
        <div class="form-field"><label for="quiz-course">Course</label><select id="quiz-course" name="courseId" required>${courseOptions}</select></div>
        <div id="quiz-question-list">${quizQuestionEditor(0)}</div>
        <button type="button" class="button button-quiet" data-action="add-quiz-question">Add question</button>
        <p id="quiz-form-error" class="form-error" role="status" aria-live="polite"></p>
      </form>`,
      "Create and publish",
    );
    const button = document.querySelector(".modal .button-primary");
    button.dataset.action = "save-quiz";
    button.type = "button";
  } catch (error) {
    showToast(error.message);
  }
}

async function openQuizAttempt(quizId) {
  try {
    const { quiz } = await apiRequest(`/api/quizzes/${encodeURIComponent(quizId)}`);
    const questions = quiz.questions.map((question) => `<fieldset class="quiz-attempt-question" data-question-id="${escapeHtml(question.id)}">
      <legend>${escapeHtml(question.prompt)}</legend>
      ${question.options.map((option) => `<label class="quiz-answer-option"><input type="radio" name="answer-${escapeHtml(question.id)}" value="${escapeHtml(option.id)}" required /><span>${escapeHtml(option.text)}</span></label>`).join("")}
    </fieldset>`).join("");
    showModal(
      quiz.title,
      "Choose one answer for every question. Your result will be final after submission.",
      `<form id="student-quiz-form">${questions}</form>`,
      "Submit quiz",
    );
    const button = document.querySelector(".modal .button-primary");
    button.dataset.action = "submit-quiz-attempt";
    button.dataset.quizId = quiz.id;
    button.type = "button";
  } catch (error) {
    showToast(error.message);
  }
}

async function saveQuiz() {
  const form = document.querySelector("#faculty-quiz-form");
  if (!form?.reportValidity()) return;
  const button = document.querySelector("[data-action='save-quiz']");
  const errorTarget = document.querySelector("#quiz-form-error");
  const questions = Array.from(form.querySelectorAll(".quiz-question-editor"), (editor) => ({
    prompt: editor.querySelector("[name='prompt']").value.trim(),
    options: Array.from(editor.querySelectorAll("[name='option']"), (option) => option.value.trim()),
    correctOption: Number(editor.querySelector("[name='correctOption']").value),
  }));
  errorTarget.textContent = "";
  button.disabled = true;
  try {
    await apiRequest("/api/faculty/quizzes", {
      method: "POST",
      body: JSON.stringify({
        title: form.elements.title.value.trim(),
        courseId: form.elements.courseId.value,
        questions,
      }),
    });
    document.querySelector(".modal-backdrop")?.remove();
    showToast("Quiz created and published.");
    loadFacultyQuizzes(apiRequest, escapeHtml);
  } catch (error) {
    errorTarget.textContent = error.message;
    button.disabled = false;
  }
}

async function submitQuizAttempt(button) {
  const form = document.querySelector("#student-quiz-form");
  if (!form?.reportValidity()) return;
  const answers = Array.from(form.querySelectorAll(".quiz-attempt-question"), (question) => ({
    questionId: question.dataset.questionId,
    optionId: question.querySelector("input[type='radio']:checked")?.value,
  }));
  button.disabled = true;
  try {
    const { attempt } = await apiRequest(`/api/quizzes/${encodeURIComponent(button.dataset.quizId)}/attempts`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    document.querySelector(".modal-backdrop")?.remove();
    showToast(`Quiz submitted. Your score: ${attempt.score}/${attempt.totalQuestions}.`);
    loadStudentQuizzes(apiRequest, escapeHtml);
  } catch (error) {
    showToast(error.message);
    button.disabled = false;
  }
}

function showLiveModal(isFaculty = false) {
  const title = isFaculty ? "Your live classroom is ready" : "Data Structures & Algorithms";
  const subtitle = isFaculty ? "Faculty studio · Camera and microphone access" : "Live classroom · Join with your camera and microphone";
  const content = `<div class="modal-video"><span class="live-permission-icon">${icon("video")}</span></div>
    <p class="modal-note">${isFaculty
      ? "Starting the class asks your browser for camera and microphone permission. You can record the session; everyone in the class will be notified."
      : "Joining asks your browser for camera and microphone permission. You can mute your microphone or turn off your camera at any time."}</p>`;
  showModal(title, subtitle, content, isFaculty ? "Start live class" : "Join live class");
  document.querySelector(".modal .button-primary").dataset.action = isFaculty ? "start-stream" : "join-class";
}

async function launchLiveClass(role, button) {
  if (!currentUser) {
    showToast("Sign in as a student or faculty member to join the live class.");
    return;
  }
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Waiting for camera permission…";
  try {
    await joinLiveClass(role, currentUser, showToast);
  } catch (error) {
    showToast(error.message);
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

function handleNav(target) {
  if (currentUser?.role === "faculty") {
    const sectionIds = {
      courses: "faculty-courses",
      students: "faculty-students",
      assessments: "faculty-submissions",
      quizzes: "faculty-quiz-list",
    };
    const sectionId = sectionIds[target];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target === "quizzes" && currentUser?.role === "student") {
      document.getElementById("student-quizzes")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target === "courses" && currentUser?.role === "student") {
      document.getElementById("student-courses")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
  if (target === "users") {
    refreshAdminUsers(apiRequest, escapeHtml);
    document.querySelector("#admin-users")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const labels = {
    courses: ["Your courses", "Pick up a lesson, review class notes, or continue a download.", `<div class="course-list">${[
      ["chart", "Data Structures & Algorithms", "Dr. Meera Sharma · 12 lessons", ""],
      ["zap", "Fundamentals of Electronics", "Prof. Arjun Reddy · 8 lessons", "orange"],
      ["globe", "Communication Skills", "Dr. Kavya Rao · 10 lessons", "blue"],
    ].map(([symbol, name, detail, color]) => `<div class="course-row"><span class="course-art ${color}">${icon(symbol)}</span><div class="course-details"><strong>${name}</strong><span>${detail}</span></div>${icon("play")}</div>`).join("")}</div>`],
    quizzes: ["Your quizzes", "Your work is saved locally in this demo so you can keep exploring.", `<div class="quiz-item"><div class="quiz-name"><strong>Arrays &amp; Linked Lists</strong><span>Data Structures · 10 questions</span></div><span class="quiz-due">Due tomorrow</span></div><div class="quiz-item"><div class="quiz-name"><strong>Basic Circuit Analysis</strong><span>Electronics II · 8 questions</span></div><span class="quiz-due">In 3 days</span></div>`],
    messages: ["Class messages", "Announcements and support for your learning community.", `<div class="offline-card"><span class="offline-icon">${icon("message")}</span><div><strong>Welcome to your class community</strong><p>Your faculty announcements and coordinator support will appear here.</p></div></div>`],
    classes: ["Your classes", "Manage your live and recorded classroom schedule.", `<div class="faculty-session"><div class="session-date"><strong>07</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Data Structures</strong><span>10:30 AM · Live · 32 students</span></div>${icon("play")}</div><div class="faculty-session"><div class="session-date"><strong>08</strong><span>OCT</span></div><div class="faculty-session-info"><strong>Algorithms II</strong><span>09:00 AM · Live · 28 students</span></div>${icon("play")}</div>`],
    students: ["Your students", "Progress across the rural campuses in your courses.", `<div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Attendance</th><th>Course progress</th></tr></thead><tbody><tr><td>Ananya Rao</td><td>94%</td><td>82%</td></tr><tr><td>Vijay Kumar</td><td>88%</td><td>67%</td></tr><tr><td>Sana Parveen</td><td>91%</td><td>54%</td></tr><tr><td>Ravi Kumar</td><td>72%</td><td>39%</td></tr></tbody></table></div>`],
    assessments: ["Assessment queue", "Review submitted work and support student progress.", `<div class="quiz-item"><div class="quiz-name"><strong>Arrays &amp; Linked Lists</strong><span>Data Structures · 32 submissions</span></div><span class="quiz-due">5 to review</span></div><div class="quiz-item"><div class="quiz-name"><strong>Complexity &amp; Big-O</strong><span>Algorithms II · 28 submissions</span></div><span class="quiz-due">3 to review</span></div><button class="button button-quiet" data-action="create-quiz">${icon("plus")} Create a quiz</button>`],
  };
  if (target === "overview") {
    render();
    return;
  }
  const item = labels[target];
  if (item) showModal(item[0], item[1], `<div class="nav-modal-content">${item[2]}</div>`);
}

document.addEventListener("click", async (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const action = control.dataset.action;
  const role = control.dataset.role || activeRole;

  if (action === "open-login" || action === "switch-role") {
    showLogin(role);
  } else if (action === "home") {
    if (document.querySelector(".dashboard")) render();
    else showLogin(activeRole);
  } else if (action === "toggle-password") {
    const input = document.querySelector("#password");
    if (input) {
      input.type = input.type === "password" ? "text" : "password";
      control.textContent = input.type === "password" ? "Show" : "Hide";
    }
  } else if (action === "logout") {
    leaveLiveClass();
    apiRequest("/api/auth/logout", { method: "POST" })
      .then(() => showLogin())
      .catch((error) => {
        showToast(error.message);
        render();
      });
  } else if (action === "open-live") {
    showLiveModal(false);
  } else if (action === "start-live") {
    showLiveModal(true);
  } else if (action === "start-stream") {
    launchLiveClass("faculty", control);
  } else if (action === "join-class") {
    launchLiveClass("student", control);
  } else if (action === "close-modal") {
    document.querySelector(".modal-backdrop")?.remove();
  } else if (action === "nav") {
    handleNav(control.dataset.target);
  } else if (action === "refresh-users") {
    refreshAdminUsers(apiRequest, escapeHtml);
  } else if (action === "refresh-courses") {
    refreshAdminCourses(apiRequest, escapeHtml);
  } else if (action === "toggle-course") {
    apiRequest(`/api/admin/courses/${encodeURIComponent(control.dataset.courseId)}`, {
      method: "PATCH",
      body: JSON.stringify({ active: control.dataset.active === "true" }),
    }).then(() => refreshAdminCourses(apiRequest, escapeHtml)).catch((error) => showToast(error.message));
  } else if (action === "generate-demo-students") {
    control.disabled = true;
    document.querySelector("#admin-demo-error").textContent = "";
    apiRequest("/api/admin/demo-students", { method: "POST" })
      .then(({ students }) => {
        demoStudentCredentials = students;
        const results = document.querySelector("#admin-demo-results");
        results.hidden = false;
        results.innerHTML = `<p>Save these credentials now; they will not be shown again.</p>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Temporary password</th></tr></thead><tbody>${students.map((student) =>
            `<tr><td>${escapeHtml(student.name)}</td><td>${escapeHtml(student.email)}</td><td><code>${escapeHtml(student.password)}</code></td></tr>`).join("")}</tbody></table></div>
          <button class="button button-quiet" data-action="download-demo-credentials">Download credentials CSV</button>`;
        showToast("10 demo student accounts created.");
        refreshAdminUsers(apiRequest, escapeHtml);
      })
      .catch((error) => {
        document.querySelector("#admin-demo-error").textContent = error.message;
      })
      .finally(() => { control.disabled = false; });
  } else if (action === "download-demo-credentials") {
    const csv = ["Name,Email,Temporary password", ...demoStudentCredentials.map((student) =>
      [student.name, student.email, student.password].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "demo-student-credentials.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (action === "refresh-faculty") {
    loadFacultyOverview(apiRequest, escapeHtml);
  } else if (action === "refresh-recordings") {
    loadRecordings(apiRequest, escapeHtml);
  } else if (action === "refresh-quizzes") {
    loadStudentQuizzes(apiRequest, escapeHtml);
  } else if (action === "open-student-course") {
    try {
      const course = studentCourseContent(control.dataset.courseId, escapeHtml);
      if (course) showModal(course.title, course.subtitle, course.html, "Close course", "modal-learning");
      else showToast("That course is no longer available. Refresh your courses and try again.");
    } catch (error) {
      showToast(`Could not open this course: ${error.message}`);
    }
  } else if (action === "continue-course") {
    try {
      const courseId = control.dataset.courseId;
      const lessonId = getNextStudentLessonId(courseId);
      if (!lessonId) {
        showToast("There are no lessons available in this course yet.");
      } else {
        const lesson = studentLessonContent(courseId, lessonId, escapeHtml);
        showModal(lesson.title, lesson.subtitle, lesson.html, "Close lesson", "modal-learning");
      }
    } catch (error) {
      showToast(`Could not continue this course: ${error.message}`);
    }
  } else if (action === "open-student-lesson") {
    try {
      const lesson = studentLessonContent(control.dataset.courseId, control.dataset.lessonId, escapeHtml);
      showModal(lesson.title, lesson.subtitle, lesson.html, "Close lesson", "modal-learning");
    } catch (error) {
      showToast(`Could not open this lesson: ${error.message}`);
    }
  } else if (action === "complete-student-lesson") {
    try {
      const course = completeStudentLesson(control.dataset.courseId, control.dataset.lessonId);
      await loadStudentCourses(apiRequest, escapeHtml, currentUser);
      const courseContent = studentCourseContent(course.id, escapeHtml);
      showModal(courseContent.title, courseContent.subtitle, courseContent.html, "Close course", "modal-learning");
      showToast("Lesson completed. Your course progress has been saved.");
    } catch (error) {
      showToast(error.message);
    }
  } else if (action === "view-student-timetable") {
    const schedule = await loadStudentSchedule(apiRequest, escapeHtml);
    if (schedule) showModal("Your weekly timetable", "Recurring sessions for your active courses.", studentTimetableContent(escapeHtml), "Close timetable", "modal-learning");
  } else if (action === "start-quiz") {
    openQuizAttempt(control.dataset.quizId);
  } else if (action === "create-quiz") {
    openQuizBuilder();
  } else if (action === "add-quiz-question") {
    const list = document.querySelector("#quiz-question-list");
    if (list && list.children.length < 20) list.insertAdjacentHTML("beforeend", quizQuestionEditor(list.children.length));
    else showToast("A quiz can contain up to 20 questions.");
  } else if (action === "remove-quiz-question") {
    control.closest(".quiz-question-editor")?.remove();
    document.querySelectorAll(".quiz-question-editor legend").forEach((legend, index) => {
      legend.textContent = `Question ${index + 1}`;
    });
  } else if (action === "save-quiz") {
    saveQuiz();
  } else if (action === "submit-quiz-attempt") {
    submitQuizAttempt(control);
  } else if (action === "notify") {
    showToast("You're all caught up. Your schedule is up to date.");
  }
});

window.addEventListener("class-recording-saved", (event) => {
  if (currentUser?.role === "faculty") loadRecordings(apiRequest, escapeHtml);
  showToast(`Recording saved: ${event.detail.title}. Download it to watch offline.`);
});

window.addEventListener("class-recording-error", (event) => {
  showToast(`Recording upload failed: ${event.detail}`);
});

app.addEventListener("change", (event) => {
  if (event.target.matches("[data-action='language']")) {
    showToast(`Interface language selected: ${event.target.value}.`);
  }
});

app.addEventListener("submit", async (event) => {
  if (!["login-form", "admin-user-form", "admin-course-form"].includes(event.target.id) && !event.target.matches(".grade-form")) return;
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  if (form.matches(".grade-form")) {
    const submissionId = form.dataset.submissionId;
    const button = document.querySelector(`.grade-submit[data-submission-id="${CSS.escape(submissionId)}"]`);
    if (!button) return;
    button.disabled = true;
    try {
      await apiRequest(`/api/faculty/submissions/${encodeURIComponent(submissionId)}/grade`, {
        method: "PATCH",
        body: JSON.stringify({
          marks: Number(formData.get("marks")),
          feedback: String(formData.get("feedback") || ""),
        }),
      });
      showToast("Marks submitted successfully.");
      await loadFacultyOverview(apiRequest, escapeHtml);
    } catch (requestError) {
      showToast(requestError.message);
      button.disabled = false;
    }
    return;
  }
  if (form.id === "login-form") {
    const error = document.querySelector("#form-error");
    const button = form.querySelector("button[type='submit']");
    error.textContent = "";
    button.disabled = true;
    try {
      const { user } = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(formData.get("email") || "").trim(),
          password: String(formData.get("password") || ""),
          role: form.dataset.role,
        }),
      });
      currentUser = user;
      app.innerHTML = dashboardPage(user);
      loadDashboardData(user);
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      button.disabled = false;
    }
    return;
  }

  if (form.id === "admin-course-form") {
    const error = document.querySelector("#admin-course-error");
    error.textContent = "";
    try {
      await apiRequest("/api/admin/courses", {
        method: "POST",
        body: JSON.stringify({
          ...Object.fromEntries(formData.entries()),
          instructorId: Number(formData.get("instructorId")),
          active: formData.get("active") === "true",
        }),
      });
      form.reset();
      showToast("Course created.");
      refreshAdminCourses(apiRequest, escapeHtml);
    } catch (requestError) {
      error.textContent = requestError.message;
    }
    return;
  }

  const error = document.querySelector("#admin-form-error");
  error.textContent = "";
  try {
    await apiRequest("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    form.reset();
    showToast("Account created.");
    refreshAdminUsers(apiRequest, escapeHtml);
  } catch (requestError) {
    error.textContent = requestError.message;
  }
});

render();
