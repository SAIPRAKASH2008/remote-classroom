const bcrypt = require("bcryptjs");
const { findActiveUserByEmail } = require("../models/userModel");

async function login(req, res) {
  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;
  if (!email || !password || !["student", "faculty", "admin"].includes(role)) {
    return res.status(400).json({ error: "Enter your email, password and account type." });
  }

  const user = await findActiveUserByEmail(email);
  if (!user || user.role !== role || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect for this account type." });
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: req.session.user });
}

function currentUser(req, res) {
  res.json({ user: req.session.user || null });
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("rc.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.status(204).end();
  });
}

module.exports = { currentUser, login, logout };
