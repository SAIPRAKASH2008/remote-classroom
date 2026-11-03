const { db } = require("../config/database");

const demoLessons = {
  CSE201: [
    ["Arrays and complexity", "Learn how arrays store values in order, access items by index, and how insertion or search costs change as the collection grows."],
    ["Linked lists", "Compare singly and doubly linked nodes with arrays. Practice insertion, deletion, and traversal while tracking the extra memory each node needs."],
    ["Stacks and queues", "Use the last-in-first-out stack and first-in-first-out queue models. Work through browser history, function calls, and task scheduling examples."],
    ["Recursion", "Break a problem into smaller instances of itself. Identify base cases, trace the call stack, and compare recursive and iterative solutions."],
    ["Trees and binary search trees", "Read tree terminology, traverse a binary tree, and use ordering rules to search, insert, and remove values."],
    ["Heaps and priority queues", "Build a min-heap and max-heap, follow sift-up and sift-down operations, and connect heaps to priority queues."],
    ["Graphs and traversal", "Model relationships with adjacency lists and matrices. Trace breadth-first and depth-first search on a small graph."],
    ["Sorting and review", "Compare common sorting approaches, reason about their time and space costs, and choose a suitable algorithm for a given input."],
  ],
  ECE102: [
    ["Electrical quantities", "Define charge, current, voltage, and power, then identify their units and directions in a simple circuit."],
    ["Ohm's law", "Use the relationship between voltage, current, and resistance to solve for an unknown quantity and check the result's units."],
    ["Series circuits", "Calculate equivalent resistance and circuit current for series components, then find the voltage drop across each resistor."],
    ["Parallel circuits", "Apply current division and equivalent-resistance rules to parallel branches, checking that branch currents add to the source current."],
    ["Kirchhoff's laws", "Use Kirchhoff's current and voltage laws to write equations at a node and around a closed loop."],
    ["Capacitors and inductors", "Explore how capacitors and inductors store energy and how their voltage and current respond to changing signals."],
    ["Diodes and rectifiers", "Describe the diode's forward and reverse behavior and trace how a rectifier converts an alternating input."],
    ["Circuit analysis review", "Combine circuit laws and component models to solve a multi-step network, then verify the answer with power balance."],
  ],
};

const timetableTemplates = [
  { code: "CSE201", weekday: 2, startTime: "10:30", durationMinutes: 45, classType: "Live class" },
  { code: "ECE102", weekday: 2, startTime: "13:00", durationMinutes: 35, classType: "Course session" },
  { code: "CSE201", weekday: 4, startTime: "10:30", durationMinutes: 45, classType: "Live class" },
  { code: "ECE102", weekday: 5, startTime: "13:00", durationMinutes: 35, classType: "Course session" },
];

function getCourseLessons(course) {
  const lessons = demoLessons[course.code] || [
    [`Introduction to ${course.title}`, `Review the goals, key vocabulary, and learning outcomes for ${course.title}. Write down what you already know and the questions you want this course to answer.`],
    [`Core concepts in ${course.title}`, `Identify the foundational ideas in ${course.title}. Make a short glossary and explain how the concepts relate to one another.`],
    [`A worked example`, `Follow a guided example related to ${course.title}. Pause at each step, predict what comes next, and compare your reasoning with the explanation.`],
    [`Practice and application`, `Apply the ideas from ${course.title} to a new problem. Show your steps, check your result, and note any assumptions you made.`],
    [`Review and next steps`, `Summarize the main ideas from ${course.title}, revisit anything that was unclear, and prepare one question for your instructor.`],
  ];
  return lessons.map(([title, description], index) => ({
    id: `${course.code}-${index + 1}`,
    title,
    description,
    lessonNumber: index + 1,
  }));
}

async function getStudentTimetable(courses) {
  const activeCourses = courses.filter((course) => course.active !== false);
  const templates = timetableTemplates.filter((entry) =>
    activeCourses.some((course) => course.code === entry.code));
  if (!templates.length) return [];

  const facultyIds = [...new Set(activeCourses.map((course) => course.instructorId).filter(Boolean))];
  let faculty = [];
  if (db && facultyIds.length) {
    const { rows } = await db.query(
      "SELECT id, name FROM users WHERE id = ANY($1::bigint[]) AND role = 'faculty' AND active = TRUE",
      [facultyIds],
    );
    faculty = rows;
  }

  return templates.map((entry) => {
    const course = activeCourses.find((item) => item.code === entry.code);
    const instructorName = faculty.find((item) => String(item.id) === String(course.instructorId))?.name
      || course.instructorName
      || "Faculty";
    return {
      ...entry,
      courseId: course.id,
      courseTitle: course.title,
      instructorName,
    };
  }).sort((left, right) =>
    left.weekday - right.weekday || left.startTime.localeCompare(right.startTime));
}

module.exports = { getCourseLessons, getStudentTimetable };
