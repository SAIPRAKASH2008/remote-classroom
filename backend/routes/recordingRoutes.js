const express = require("express");
const { getRecordingFile, getRecordings, uploadRecording } = require("../controllers/recordingController");
const { requireAuth, requireFaculty } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(getRecordings));
router.post("/", requireFaculty, asyncHandler(uploadRecording));
router.get("/:recordingId/file", asyncHandler(getRecordingFile));

module.exports = router;
