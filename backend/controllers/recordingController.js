const fs = require("fs");
const {
  canAccessRecording,
  findRecording,
  listRecordings,
  maxRecordingBytes,
  saveRecording,
} = require("../models/recordingModel");

async function getRecordings(req, res) {
  const recordings = await listRecordings();
  res.json({
    recordings: recordings
      .filter((recording) => canAccessRecording(req.session.user, recording))
      .map(({ id, title, instructorName, durationSeconds, sizeBytes, createdAt }) => ({
        id,
        title,
        instructorName,
        durationSeconds,
        sizeBytes: Number(sizeBytes),
        createdAt,
      })),
  });
}

async function uploadRecording(req, res) {
  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "video/webm" && contentType !== "video/mp4") {
    return res.status(415).json({ error: "Upload the recording as an MP4 or WebM video." });
  }
  const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
  const durationSeconds = Number(req.query.duration);
  if (title.length < 2 || title.length > 160) {
    return res.status(400).json({ error: "Recording title must be between 2 and 160 characters." });
  }
  if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 14400) {
    return res.status(400).json({ error: "Recording duration must be between 1 second and 4 hours." });
  }
  const contentLength = Number(req.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > maxRecordingBytes) {
    req.resume();
    return res.status(413).json({ error: "Recordings must be 500 MB or smaller." });
  }

  try {
    const recording = await saveRecording(req, {
      instructor: req.session.user,
      title,
      durationSeconds,
      mimeType: contentType,
    });
    res.status(201).json({
      recording: {
        id: recording.id,
        title: recording.title,
        instructorName: recording.instructorName,
        durationSeconds: recording.durationSeconds,
        sizeBytes: recording.sizeBytes,
        createdAt: recording.createdAt,
      },
    });
  } catch (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: error.message });
    }
    if (error.code === "ERR_STREAM_PREMATURE_CLOSE" || error.code === "ECONNRESET") {
      return res.status(400).json({ error: "The recording upload was interrupted. Try recording again." });
    }
    throw error;
  }
}

async function getRecordingFile(req, res) {
  const recording = await findRecording(req.params.recordingId);
  if (!recording || !canAccessRecording(req.session.user, recording)) {
    return res.status(404).json({ error: "Recording not found." });
  }
  try {
    await fs.promises.access(recording.filePath, fs.constants.R_OK);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ error: "Recording file is no longer available." });
    throw error;
  }
  const baseName = recording.title.replace(/[^\w -]/g, "").trim().replace(/\s+/g, "-") || "class-recording";
  const extension = recording.mimeType === "video/mp4" ? "mp4" : "webm";
  const fileName = `${baseName}.${extension}`;
  res.set({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (req.query.download === "0") {
    return res.type(recording.mimeType).sendFile(recording.filePath, (error) => {
      if (error && !res.headersSent) res.status(error.statusCode || 500).end();
    });
  }
  res.download(recording.filePath, fileName, (error) => {
    if (error && !res.headersSent) res.status(error.statusCode || 500).end();
  });
}

module.exports = { getRecordingFile, getRecordings, uploadRecording };
