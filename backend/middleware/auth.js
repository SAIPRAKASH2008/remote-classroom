function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please sign in to continue." });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user?.role !== "admin") {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  next();
}

function requireFaculty(req, res, next) {
  if (req.session.user?.role !== "faculty") {
    return res.status(403).json({ error: "Faculty access is required." });
  }
  next();
}

function requireStudent(req, res, next) {
  if (req.session.user?.role !== "student") {
    return res.status(403).json({ error: "Student access is required." });
  }
  next();
}

module.exports = { requireAdmin, requireAuth, requireFaculty, requireStudent };
