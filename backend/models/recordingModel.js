const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");
const { db } = require("../config/database");

const recordingsDirectory = path.resolve(process.env.RECORDINGS_DIR || path.join(__dirname, "../recordings"));
const manifestPath = path.join(recordingsDirectory, "manifest.json");
const maxRecordingBytes = 500 * 1024 * 1024;
let localRecordings;
let manifestWrite = Promise.resolve();

async function ensureStorage() {
  await fs.promises.mkdir(recordingsDirectory, { recursive: true });
}

async function readLocalRecordings() {
  if (localRecordings) return localRecordings;
  await ensureStorage();
  try {
    localRecordings = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    localRecordings = [];
  }
  if (!Array.isArray(localRecordings)) throw new Error("The recording manifest is invalid.");
  return localRecordings;
}

async function persistLocalRecordings() {
  const contents = JSON.stringify(localRecordings, null, 2);
  const temporaryPath = `${manifestPath}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.promises.writeFile(temporaryPath, contents, { flag: "wx" });
    await fs.promises.rename(temporaryPath, manifestPath);
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true });
    throw error;
  }
}

async function addLocalRecording(recording) {
  await readLocalRecordings();
  manifestWrite = manifestWrite.catch(() => {}).then(async () => {
    localRecordings.push(recording);
    try {
      await persistLocalRecordings();
    } catch (error) {
      localRecordings = localRecordings.filter((item) => item.id !== recording.id);
      throw error;
    }
  });
  await manifestWrite;
}

async function saveRecording(request, { instructor, title, durationSeconds, mimeType }) {
  await ensureStorage();
  const id = crypto.randomUUID();
  const extension = mimeType === "video/mp4" ? "mp4" : mimeType === "video/webm" ? "webm" : null;
  if (!extension) throw new Error("Unsupported recording format.");
  const fileName = `${id}.${extension}`;
  const filePath = path.join(recordingsDirectory, fileName);
  const temporaryPath = path.join(recordingsDirectory, `${id}.upload`);
  let sizeBytes = 0;
  const sizeLimit = new Transform({
    transform(chunk, encoding, callback) {
      sizeBytes += chunk.length;
      if (sizeBytes > maxRecordingBytes) {
        const error = new Error("Recordings must be 500 MB or smaller.");
        error.code = "LIMIT_FILE_SIZE";
        callback(error);
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(request, sizeLimit, fs.createWriteStream(temporaryPath, { flags: "wx" }));
    if (sizeBytes === 0) throw new Error("The recording file is empty.");
    await fs.promises.rename(temporaryPath, filePath);
    const metadata = {
      id,
      instructorId: instructor.id,
      instructorName: instructor.name,
      title,
      mimeType,
      sizeBytes,
      durationSeconds,
    };

    if (db) {
      const { rows } = await db.query(
        `INSERT INTO class_recordings
           (id, instructor_id, title, file_name, mime_type, size_bytes, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING created_at`,
        [id, instructor.id, title, fileName, metadata.mimeType, sizeBytes, durationSeconds],
      );
      metadata.createdAt = rows[0].created_at;
    } else {
      metadata.createdAt = new Date().toISOString();
      metadata.fileName = fileName;
      await addLocalRecording(metadata);
    }
    return metadata;
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true });
    await fs.promises.rm(filePath, { force: true });
    throw error;
  }
}

async function listRecordings() {
  if (!db) {
    const records = await readLocalRecordings();
    return records.slice().sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }
  const { rows } = await db.query(
    `SELECT r.id, r.instructor_id AS "instructorId", u.name AS "instructorName",
            r.title, r.mime_type AS "mimeType", r.size_bytes AS "sizeBytes",
            r.duration_seconds AS "durationSeconds", r.created_at AS "createdAt"
     FROM class_recordings r
     JOIN users u ON u.id = r.instructor_id
     ORDER BY r.created_at DESC`,
  );
  return rows;
}

async function findRecording(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  if (!db) {
    const records = await readLocalRecordings();
    const recording = records.find((item) => item.id === id);
    return recording ? { ...recording, filePath: path.join(recordingsDirectory, recording.fileName) } : null;
  }
  const { rows } = await db.query(
    `SELECT r.id, r.instructor_id AS "instructorId", u.name AS "instructorName",
            r.title, r.file_name AS "fileName", r.mime_type AS "mimeType",
            r.size_bytes AS "sizeBytes", r.duration_seconds AS "durationSeconds",
            r.created_at AS "createdAt"
     FROM class_recordings r
     JOIN users u ON u.id = r.instructor_id
     WHERE r.id = $1`,
    [id],
  );
  return rows[0] ? { ...rows[0], filePath: path.join(recordingsDirectory, rows[0].fileName) } : null;
}

function canAccessRecording(user, recording) {
  return user.role === "admin"
    || user.role === "student"
    || (user.role === "faculty" && String(user.id) === String(recording.instructorId));
}

module.exports = {
  canAccessRecording,
  findRecording,
  listRecordings,
  maxRecordingBytes,
  saveRecording,
};
