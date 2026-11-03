const { findSubmissionForFaculty, getFacultyOverview, gradeSubmission } = require("../models/facultyModel");

async function getOverview(req, res) {
  res.json({ overview: await getFacultyOverview(req.session.user) });
}

async function submitGrade(req, res) {
  const submissionId = Number(req.params.submissionId);
  const { marks, feedback = "" } = req.body || {};
  if (!Number.isSafeInteger(submissionId) || submissionId < 1) {
    return res.status(400).json({ error: "Invalid submission." });
  }
  if (typeof marks !== "number" || !Number.isFinite(marks)) {
    return res.status(400).json({ error: "Enter marks as a number." });
  }
  if (typeof feedback !== "string" || feedback.length > 2000) {
    return res.status(400).json({ error: "Feedback must be 2,000 characters or fewer." });
  }

  const submission = await findSubmissionForFaculty(req.session.user, submissionId);
  if (!submission) return res.status(404).json({ error: "Submission not found in your courses." });
  if (marks < 0 || marks > Number(submission.max_marks)) {
    return res.status(400).json({ error: `Marks must be between 0 and ${submission.max_marks}.` });
  }

  const updated = await gradeSubmission(req.session.user, submissionId, marks, feedback.trim());
  if (!updated) return res.status(404).json({ error: "Submission is no longer available to grade." });
  res.json({ submission: updated });
}

module.exports = { getOverview, submitGrade };
