const { listActiveCoursesForStudents } = require("../models/facultyModel");
const { listActiveFaculty } = require("../models/userModel");
const { getCourseLessons, getStudentTimetable } = require("../models/studentLearningModel");

async function getCourses(req, res) {
  const faculty = await listActiveFaculty();
  const courses = await listActiveCoursesForStudents(faculty);
  res.json({
    courses: courses.map((course) => ({
      ...course,
      lessons: getCourseLessons(course),
    })),
  });
}

async function getTimetable(req, res) {
  const faculty = await listActiveFaculty();
  const courses = await listActiveCoursesForStudents(faculty);
  res.json({ schedule: await getStudentTimetable(courses) });
}

module.exports = { getCourses, getTimetable };
