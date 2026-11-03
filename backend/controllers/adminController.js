const bcrypt = require("bcryptjs");
const { createCourse, listAdminCourses, setCourseActive } = require("../models/facultyModel");
const { createDemoStudents, createUser, listActiveFaculty, listUsers } = require("../models/userModel");

async function getUsers(req, res) {
  res.json({ users: await listUsers() });
}

async function addUser(req, res) {
  const { name, email, password, role } = req.body || {};
  if (
    typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120
    || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    || typeof password !== "string" || password.length < 8
    || !["student", "faculty", "admin"].includes(role)
  ) {
    return res.status(400).json({ error: "Enter a valid name, email, role and password of at least 8 characters." });
  }

  try {
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      role,
    });
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
    throw error;
  }
}

async function addDemoStudents(req, res) {
  res.set("Cache-Control", "no-store");
  res.status(201).json({ students: await createDemoStudents() });
}

async function getCourses(req, res) {
  const faculty = await listActiveFaculty();
  res.json({ courses: await listAdminCourses(faculty), faculty });
}

async function addCourse(req, res) {
  const { title, code, instructorId, active = true } = req.body || {};
  const parsedInstructorId = Number(instructorId);
  if (
    typeof title !== "string" || title.trim().length < 2 || title.trim().length > 160
    || typeof code !== "string" || !/^[A-Za-z0-9_-]{2,32}$/.test(code.trim())
    || !Number.isSafeInteger(parsedInstructorId) || parsedInstructorId < 1
    || typeof active !== "boolean"
  ) {
    return res.status(400).json({ error: "Enter a valid course title, course code, faculty member and status." });
  }

  try {
    const faculty = await listActiveFaculty();
    const course = await createCourse({
      instructorId: parsedInstructorId,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      active,
    }, faculty);
    if (!course) return res.status(400).json({ error: "Select an active faculty account." });
    res.status(201).json({ course });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "That course code is already assigned to this faculty member." });
    throw error;
  }
}

async function updateCourseStatus(req, res) {
  const courseId = req.params.courseId;
  if (!/^\d+$/.test(courseId) || Number(courseId) < 1) {
    return res.status(400).json({ error: "Invalid course." });
  }
  const { active } = req.body || {};
  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "Choose whether the course should be active." });
  }
  const course = await setCourseActive(courseId, active);
  if (!course) return res.status(404).json({ error: "Course not found." });
  res.json({ course });
}

module.exports = { addCourse, addDemoStudents, addUser, getCourses, getUsers, updateCourseStatus };
