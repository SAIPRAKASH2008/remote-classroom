require("dotenv").config();

const bcrypt = require("bcryptjs");
const { initializeDatabase, pool } = require("../config/database");
const { upsertAdmin } = require("../models/userModel");

async function main() {
  const { BOOTSTRAP_ADMIN_NAME: name, BOOTSTRAP_ADMIN_EMAIL: email, BOOTSTRAP_ADMIN_PASSWORD: password } = process.env;
  if (!name || !email || !password) {
    throw new Error("Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env.");
  }
  if (name.trim().length < 2 || name.trim().length > 120) {
    throw new Error("The admin name must be between 2 and 120 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error("Enter a valid admin email address.");
  }
  if (password.length < 6) {
    throw new Error("The admin password must be at least 6 characters.");
  }

  await initializeDatabase();
  await upsertAdmin({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log("Admin account provisioned. Sign in using the configured admin email and password.");
}

main()
  .catch((error) => {
    console.error("Could not provision admin account:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());
