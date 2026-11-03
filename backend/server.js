require("dotenv").config();

const express = require("express");
const http = require("http");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const { initializeDatabase, isDatabaseConfigured, pool } = require("./config/database");
const { getDemoAccounts, initializeLocalAdmin, seedDemoAccounts } = require("./models/userModel");
const { seedDemoFacultyData } = require("./models/facultyModel");
const PostgreSQLSessionStore = require("./config/sessionStore");
const attachClassroomSignaling = require("./services/classroomSignaling");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const recordingRoutes = require("./routes/recordingRoutes");
const quizRoutes = require("./routes/quizRoutes");
const studentRoutes = require("./routes/studentRoutes");

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be set to at least 32 characters.");
}

const app = express();
const port = Number(process.env.PORT || 3000);
const sessionStore = isDatabaseConfigured ? new PostgreSQLSessionStore(pool) : new session.MemoryStore();
const sessionMiddleware = session({
  name: "rc.sid",
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
  },
});

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "20kb" }));
app.use(sessionMiddleware);
app.use("/socket.io", express.static(path.join(__dirname, "../node_modules/socket.io/client-dist")));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/demo-accounts", (req, res) => {
  res.json({ accounts: process.env.NODE_ENV === "production" ? [] : getDemoAccounts() });
});
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/student", studentRoutes);
app.use(express.static(path.join(__dirname, "../frontend"), { dotfiles: "ignore" }));
app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use((error, req, res, next) => {
  console.error("Request failed:", error);
  if (res.headersSent) return next(error);
  const status = error.status && error.status < 500 ? error.status : 500;
  res.status(status).json({
    error: status === 400 ? "Request body must contain valid JSON." : "Something went wrong. Please try again.",
  });
});
const server = http.createServer(app);
const classroomSignaling = attachClassroomSignaling(
  server,
  sessionMiddleware,
  process.env.NODE_ENV === "production"
    ? []
    : getDemoAccounts().filter((account) => account.role === "student"),
);

async function start() {
  if (isDatabaseConfigured) {
    await initializeDatabase();
    await pool.query("SELECT 1");
  } else {
    await initializeLocalAdmin();
    console.warn("PostgreSQL is not configured. Running with temporary, in-memory development accounts and sessions.");
  }
  if (process.env.NODE_ENV !== "production") {
    await seedDemoAccounts();
    await seedDemoFacultyData();
  }
  server.listen(port, () => console.log(`Remote Classrooms is running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Could not start the website:", error);
    classroomSignaling.close();
    server.close();
    sessionStore.close?.();
    pool?.end();
    process.exitCode = 1;
  });
}

module.exports = { app, server, start };
