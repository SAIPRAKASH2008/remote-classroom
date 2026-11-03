export async function loadStudentQuizzes(apiRequest, escapeHtml) {
  const container = document.querySelector("#student-quiz-list");
  if (!container) return;
  container.innerHTML = `<p class="faculty-section-note">Loading quizzes…</p>`;
  try {
    const { quizzes } = await apiRequest("/api/quizzes");
    container.innerHTML = quizzes.length
      ? `<div class="quiz-list">${quizzes.map((quiz) => `<article class="quiz-list-item">
          <div class="quiz-name"><strong>${escapeHtml(quiz.title)}</strong><span>${escapeHtml(quiz.courseTitle)} · ${escapeHtml(quiz.courseCode)} · ${quiz.questionCount} questions</span></div>
          ${quiz.attempt
            ? `<span class="quiz-due completed">Score: ${quiz.attempt.score}/${quiz.attempt.totalQuestions}</span>`
            : `<button class="button button-primary" data-action="start-quiz" data-quiz-id="${escapeHtml(quiz.id)}">Attempt quiz</button>`}
        </article>`).join("")}</div>`
      : `<p class="faculty-section-note">No active quizzes are available right now.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
  }
}

export async function loadFacultyQuizzes(apiRequest, escapeHtml) {
  const container = document.querySelector("#faculty-quiz-list");
  if (!container) return;
  container.innerHTML = `<p class="faculty-section-note">Loading quizzes…</p>`;
  try {
    const { quizzes } = await apiRequest("/api/faculty/quizzes");
    container.innerHTML = quizzes.length
      ? `<div class="quiz-list">${quizzes.map((quiz) => `<article class="quiz-list-item">
          <div class="quiz-name"><strong>${escapeHtml(quiz.title)}</strong><span>${escapeHtml(quiz.courseTitle)} · ${escapeHtml(quiz.courseCode)} · ${quiz.questionCount} questions</span></div>
          <span class="quiz-due">${quiz.attemptCount} attempts</span>
        </article>`).join("")}</div>`
      : `<p class="faculty-section-note">No quizzes created yet.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
  }
}
