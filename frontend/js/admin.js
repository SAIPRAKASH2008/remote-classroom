export function adminDashboard(user, escapeHtml) {
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
      <div class="panel-heading"><div><h2>Generate demo students</h2><p class="faculty-section-note">Create 10 student accounts with random passwords. Credentials are shown only once.</p></div></div>
      <button class="button button-primary" data-action="generate-demo-students">Generate 10 demo students</button>
      <p class="form-error" id="admin-demo-error" role="status" aria-live="polite"></p>
      <div id="admin-demo-results" class="demo-credential-results" hidden></div>
    </section>
    <section class="panel admin-panel">
      <div class="panel-heading"><h2>Accounts</h2><button class="panel-action" data-action="refresh-users">Refresh</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody id="admin-users"><tr><td colspan="4">Loading accounts…</td></tr></tbody></table></div>
    </section>`;
}

export async function loadAdminUsers(apiRequest, escapeHtml) {
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

export function adminCoursesPanel() {
  return `
    <section class="panel admin-panel">
      <div class="panel-heading"><div><h2>Create a course</h2><p class="faculty-section-note">Assign an active faculty member and choose whether students can access it.</p></div></div>
      <form id="admin-course-form" class="admin-user-form">
        <div class="form-field"><label for="new-course-title">Course title</label><input id="new-course-title" name="title" required minlength="2" maxlength="160" /></div>
        <div class="form-field"><label for="new-course-code">Course code</label><input id="new-course-code" name="code" required minlength="2" maxlength="32" pattern="[A-Za-z0-9_-]+" /></div>
        <div class="form-field"><label for="new-course-instructor">Faculty member</label><select id="new-course-instructor" name="instructorId" required><option value="">Loading faculty…</option></select></div>
        <div class="form-field"><label for="new-course-active">Status</label><select id="new-course-active" name="active"><option value="true">Active</option><option value="false">Inactive</option></select></div>
        <button class="button button-primary" type="submit">Add course</button>
        <p class="form-error" id="admin-course-error" role="status" aria-live="polite"></p>
      </form>
    </section>
    <section class="panel admin-panel">
      <div class="panel-heading"><h2>Courses</h2><button class="panel-action" data-action="refresh-courses">Refresh</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Course</th><th>Code</th><th>Faculty</th><th>Status</th><th>Action</th></tr></thead><tbody id="admin-courses"><tr><td colspan="5">Loading courses…</td></tr></tbody></table></div>
    </section>`;
}

export async function loadAdminCourses(apiRequest, escapeHtml) {
  const tableBody = document.querySelector("#admin-courses");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="5">Loading courses…</td></tr>`;
  try {
    const { courses, faculty } = await apiRequest("/api/admin/courses");
    const instructorSelect = document.querySelector("#new-course-instructor");
    if (instructorSelect) {
      instructorSelect.innerHTML = `<option value="">Select faculty</option>${faculty.map((member) =>
        `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)} · ${escapeHtml(member.email)}</option>`).join("")}`;
    }
    tableBody.innerHTML = courses.length
      ? courses.map((course) => `<tr>
          <td>${escapeHtml(course.title)}</td><td>${escapeHtml(course.code)}</td>
          <td>${escapeHtml(course.instructorName)}</td><td>${course.active ? "Active" : "Inactive"}</td>
          <td><button class="panel-action" data-action="toggle-course" data-course-id="${escapeHtml(course.id)}" data-active="${!course.active}">${course.active ? "Deactivate" : "Activate"}</button></td>
        </tr>`).join("")
      : `<tr><td colspan="5">No courses have been created yet.</td></tr>`;
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
  }
}
