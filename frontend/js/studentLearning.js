let studentCourses = [];
let studentId;
let studentSchedule = [];

function readProgress(courseId) {
  const key = `remote-classrooms-learning:${studentId}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  return saved[String(courseId)] || { completedLessonIds: [], lastLessonId: null };
}

function writeProgress(courseId, progress) {
  const key = `remote-classrooms-learning:${studentId}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  saved[String(courseId)] = progress;
  localStorage.setItem(key, JSON.stringify(saved));
}

function getCourse(courseId) {
  return studentCourses.find((course) => String(course.id) === String(courseId));
}

function getLesson(course, lessonId) {
  return course?.lessons.find((lesson) => String(lesson.id) === String(lessonId));
}

function getCourseProgress(course) {
  const progress = readProgress(course.id);
  const completed = new Set(progress.completedLessonIds);
  return {
    ...progress,
    completedLessonIds: [...completed],
    percent: course.lessons.length ? Math.round((completed.size / course.lessons.length) * 100) : 0,
  };
}

export async function loadStudentCourses(apiRequest, escapeHtml, user) {
  const container = document.querySelector("#student-courses");
  if (!container) return;
  studentId = user.id;
  container.innerHTML = `<p class="faculty-section-note">Loading courses…</p>`;
  try {
    const { courses } = await apiRequest("/api/student/courses");
    studentCourses = courses;
    const count = document.querySelector("[data-student-course-count]");
    if (count) count.innerHTML = `${courses.length} <small>available</small>`;
    const progressByCourse = courses.map((course) => getCourseProgress(course));
    const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
    const completedLessons = progressByCourse.reduce((total, progress) => total + progress.completedLessonIds.length, 0);
    const completedCount = document.querySelector("[data-student-lessons-completed]");
    if (completedCount) completedCount.innerHTML = `${completedLessons} <small>completed</small>`;
    const overallProgress = document.querySelector("[data-student-overall-progress]");
    if (overallProgress) overallProgress.innerHTML = `${totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0}<small>%</small>`;
    const lessonCount = document.querySelector("[data-student-lesson-count]");
    if (lessonCount) lessonCount.innerHTML = `${totalLessons} <small>in your courses</small>`;
    container.innerHTML = courses.length
      ? courses.map((course, index) => {
        const progress = progressByCourse[index];
        const nextLesson = getNextStudentLessonId(course.id);
        const nextTitle = getLesson(course, nextLesson)?.title || "Review course";
        return `<article class="student-course-row">
          <span class="course-art ${index % 2 ? "orange" : ""}">${escapeHtml(course.code.slice(0, 2))}</span>
          <div class="course-details">
            <strong>${escapeHtml(course.title)}</strong>
            <span>${escapeHtml(course.instructorName)} · ${escapeHtml(course.code)} · ${course.lessons.length} lessons</span>
            <div class="student-course-progress" role="progressbar" aria-label="${escapeHtml(course.title)} progress" aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100">
              <span style="width:${progress.percent}%"></span>
            </div>
            <small>${progress.percent}% complete</small>
          </div>
          <div class="student-course-actions">
            <button class="button button-primary button-small" data-action="continue-course" data-course-id="${escapeHtml(course.id)}">${progress.percent ? "Continue" : "Start learning"}</button>
            <button class="panel-action" data-action="open-student-course" data-course-id="${escapeHtml(course.id)}">All lessons</button>
            <span class="student-next-lesson">Next: ${escapeHtml(nextTitle)}</span>
          </div>
        </article>`;
      }).join("")
      : `<p class="faculty-section-note">No active courses are available yet.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
  }
}

export function getNextStudentLessonId(courseId) {
  const course = getCourse(courseId);
  if (!course?.lessons.length) return null;
  const progress = getCourseProgress(course);
  const completed = new Set(progress.completedLessonIds);
  const lastLesson = getLesson(course, progress.lastLessonId);
  if (lastLesson && !completed.has(lastLesson.id)) return lastLesson.id;
  return course.lessons.find((lesson) => !completed.has(lesson.id))?.id || course.lessons[course.lessons.length - 1].id;
}

export function openStudentLesson(courseId, lessonId) {
  const course = getCourse(courseId);
  const lesson = getLesson(course, lessonId);
  if (!course || !lesson) throw new Error("That course lesson is no longer available. Refresh your courses and try again.");
  const progress = getCourseProgress(course);
  writeProgress(course.id, { ...progress, lastLessonId: lesson.id });
  return { course, lesson, completed: progress.completedLessonIds.includes(lesson.id) };
}

export function completeStudentLesson(courseId, lessonId) {
  const course = getCourse(courseId);
  const lesson = getLesson(course, lessonId);
  if (!course || !lesson) throw new Error("That course lesson is no longer available. Refresh your courses and try again.");
  const progress = getCourseProgress(course);
  const completedLessonIds = new Set(progress.completedLessonIds);
  completedLessonIds.add(lesson.id);
  const nextLesson = course.lessons.find((item) => !completedLessonIds.has(item.id));
  writeProgress(course.id, {
    completedLessonIds: [...completedLessonIds],
    lastLessonId: nextLesson?.id || lesson.id,
  });
  return course;
}

export function studentCourseContent(courseId, escapeHtml) {
  const course = getCourse(courseId);
  if (!course) return null;
  const progress = getCourseProgress(course);
  return {
    title: course.title,
    subtitle: `${course.code} · ${escapeHtml(course.instructorName)} · ${progress.percent}% complete`,
    html: `<div class="student-lesson-list">${course.lessons.map((lesson) => {
      const completed = progress.completedLessonIds.includes(lesson.id);
      return `<article class="student-lesson-row">
        <span class="student-lesson-number ${completed ? "is-complete" : ""}">${completed ? "✓" : lesson.lessonNumber}</span>
        <div><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.description)}</p></div>
        <button class="button button-quiet button-small" data-action="open-student-lesson" data-course-id="${escapeHtml(course.id)}" data-lesson-id="${escapeHtml(lesson.id)}">${completed ? "Review" : "Open lesson"}</button>
      </article>`;
    }).join("")}</div>`,
  };
}

export function studentLessonContent(courseId, lessonId, escapeHtml) {
  const { course, lesson, completed } = openStudentLesson(courseId, lessonId);
  return {
    title: lesson.title,
    subtitle: `${course.title} · Lesson ${lesson.lessonNumber} of ${course.lessons.length}`,
    html: `<article class="student-lesson-content">
        <p class="eyebrow">COURSE LESSON</p>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.description)}</p>
        <div class="offline-card"><span class="offline-icon">✓</span><div><strong>Learning check</strong><p>In your own words, summarize the main idea and write down one example before moving on.</p></div></div>
      </article>
      <button class="button button-primary" data-action="complete-student-lesson" data-course-id="${escapeHtml(course.id)}" data-lesson-id="${escapeHtml(lesson.id)}" ${completed ? "disabled" : ""}>${completed ? "Lesson completed" : "Mark lesson complete"}</button>`,
  };
}

function formatTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
    .format(new Date(2020, 0, 1, hours, minutes));
}

function renderScheduleItem(item, escapeHtml, now) {
  const [hours, minutes] = item.startTime.split(":").map(Number);
  const start = new Date(now);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + item.durationMinutes * 60_000);
  const status = now >= end ? "Completed today" : now >= start ? "In progress" : "Upcoming";
  return `<article class="schedule-item">
    <div class="schedule-time">${formatTime(item.startTime)}</div>
    <div class="schedule-details ${item.classType === "Course session" ? "warm-border" : ""}">
      <strong>${escapeHtml(item.courseTitle)}</strong>
      <span>${escapeHtml(item.classType)} · ${item.durationMinutes} min · ${escapeHtml(item.instructorName)}</span>
      <small>${status}</small>
    </div>
  </article>`;
}

export async function loadStudentSchedule(apiRequest, escapeHtml) {
  const container = document.querySelector("#student-schedule");
  if (!container) return;
  const now = new Date();
  const todayName = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now);
  const date = document.querySelector("#student-schedule-date");
  if (date) date.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
  container.innerHTML = `<p class="faculty-section-note">Loading today's schedule…</p>`;
  try {
    const { schedule } = await apiRequest("/api/student/timetable");
    studentSchedule = schedule;
    const todaysSchedule = schedule.filter((item) => item.weekday === now.getDay());
    container.innerHTML = todaysSchedule.length
      ? todaysSchedule.map((item) => renderScheduleItem(item, escapeHtml, now)).join("")
      : `<p class="faculty-section-note">No classes are scheduled for ${escapeHtml(todayName)}.</p>`;

    const nextClass = schedule
      .filter((item) => item.classType === "Live class")
      .map((item) => {
        const daysUntil = (item.weekday - now.getDay() + 7) % 7;
        const startsAt = new Date(now);
        startsAt.setDate(now.getDate() + daysUntil);
        const [hours, minutes] = item.startTime.split(":").map(Number);
        startsAt.setHours(hours, minutes, 0, 0);
        return { ...item, startsAt };
      })
      .filter((item) => item.startsAt > now)
      .sort((left, right) => left.startsAt - right.startsAt)[0];
    const nextClassContainer = document.querySelector("#student-next-class");
    if (nextClassContainer) {
      nextClassContainer.innerHTML = nextClass
        ? `<span class="live-label"><span></span> NEXT LIVE CLASS · ${new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(nextClass.startsAt)}</span>
          <h3>${escapeHtml(nextClass.courseTitle)}</h3>
          <p>with ${escapeHtml(nextClass.instructorName)} · ${nextClass.durationMinutes} minutes</p>
          <button class="button live-join" data-action="open-live">${"Join class"}</button>`
        : `<span class="live-label">YOUR CLASSROOM</span><h3>No upcoming live class</h3><p>Check today's schedule or continue with a course lesson.</p>`;
    }
    return schedule;
  } catch (error) {
    container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
    return null;
  }
}

export function studentTimetableContent(escapeHtml) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `<div class="student-timetable">${dayNames.map((day, weekday) => {
    const lessons = studentSchedule.filter((item) => item.weekday === weekday);
    return `<section class="student-timetable-day"><h3>${day}</h3>
      ${lessons.length
        ? lessons.map((item) => `<div class="student-timetable-item"><strong>${formatTime(item.startTime)} · ${escapeHtml(item.courseTitle)}</strong><span>${escapeHtml(item.classType)} · ${item.durationMinutes} min · ${escapeHtml(item.instructorName)}</span></div>`).join("")
        : `<p>No scheduled classes</p>`}
    </section>`;
  }).join("")}</div>
  <p class="faculty-section-note student-timetable-note">Times are shown in your device's local time zone.</p>`;
}
