require("dotenv").config();

const bcrypt = require("bcryptjs");
const { initializeDatabase, pool } = require("../config/database");
const { createUser } = require("../models/userModel");

async function main() {
  const [role, name, email, password] = process.argv.slice(2);
  if (!["student", "faculty", "admin"].includes(role) || !name || !email || !password) {
    throw new Error("Usage: npm run create-user -- <student|faculty|admin> \"Full Name\" email password");
  }
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");

  await initializeDatabase();
  await createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role,
  });
  console.log(`Created ${role} account for ${email.trim().toLowerCase()}.`);
}

main()
  .catch((error) => {
    console.error("Could not create account:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());
