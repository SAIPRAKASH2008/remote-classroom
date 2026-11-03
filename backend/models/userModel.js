const { db } = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const localUsers = new Map();
let nextLocalId = 1;
const demoAccounts = [
  { name: "Meera Sharma", email: "faculty@ruralclass.edu", password: "TeachDemo@123", role: "faculty" },
  { name: "Ananya Rao", email: "student@ruralclass.edu", password: "StudentDemo@123", role: "student" },
  { name: "Vijay Kumar", email: "student2@ruralclass.edu", password: "StudentDemo@123", role: "student" },
];

async function initializeLocalAdmin() {
  const { BOOTSTRAP_ADMIN_NAME: name, BOOTSTRAP_ADMIN_EMAIL: email, BOOTSTRAP_ADMIN_PASSWORD: password } = process.env;
  if (!name || !email || !password) {
    throw new Error("Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env.");
  }
  await upsertAdmin({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
  });
}

async function seedDemoAccounts() {
  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    if (!db) {
      if (!localUsers.has(account.email)) {
        localUsers.set(account.email, {
          id: nextLocalId++,
          name: account.name,
          email: account.email,
          password_hash: passwordHash,
          role: account.role,
          active: true,
        });
      }
      continue;
    }
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [account.name, account.email, passwordHash, account.role],
    );
  }
}

function getDemoAccounts() {
  return demoAccounts.map(({ name, email, password, role }) => ({ name, email, password, role }));
}

async function listActiveFaculty() {
  if (!db) {
    return Array.from(localUsers.values())
      .filter((user) => user.role === "faculty" && user.active)
      .map(({ id, name, email }) => ({ id, name, email }));
  }
  const { rows } = await db.query(
    "SELECT id, name, email FROM users WHERE role = 'faculty' AND active = TRUE ORDER BY name",
  );
  return rows;
}

async function createDemoStudents() {
  const students = await Promise.all(Array.from({ length: 10 }, async (_, index) => {
    const name = `Demo Student ${String(index + 1).padStart(2, "0")}`;
    const password = crypto.randomBytes(9).toString("base64url");
    const email = `demo.student.${crypto.randomUUID()}@ruralclass.edu`;
    return {
      name,
      email,
      password,
      passwordHash: await bcrypt.hash(password, 12),
    };
  }));

  if (!db) {
    return students.map(({ name, email, password, passwordHash }) => {
      const user = { id: nextLocalId++, name, email, password_hash: passwordHash, role: "student", active: true };
      localUsers.set(email, user);
      return { name, email, password };
    });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const student of students) {
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student')",
        [student.name, student.email, student.passwordHash],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return students.map(({ name, email, password }) => ({ name, email, password }));
}

async function findActiveUserByEmail(email) {
  if (!db) {
    const user = localUsers.get(email);
    return user?.active ? user : null;
  }
  const { rows } = await db.query(
    "SELECT id, name, email, password_hash, role FROM users WHERE email = $1 AND active = TRUE LIMIT 1",
    [email],
  );
  return rows[0] || null;
}

async function listUsers() {
  if (!db) {
    return Array.from(localUsers.values(), ({ password_hash, ...user }) => user);
  }
  const { rows } = await db.query(
    "SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC",
  );
  return rows;
}

async function createUser({ name, email, passwordHash, role }) {
  if (!db) {
    if (localUsers.has(email)) {
      const error = new Error("An account with that email already exists.");
      error.code = "23505";
      throw error;
    }
    const user = { id: nextLocalId++, name, email, password_hash: passwordHash, role, active: true };
    localUsers.set(email, user);
    return { id: user.id, name, email, role, active: true };
  }
  const { rows } = await db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, email, passwordHash, role],
  );
  return { id: rows[0].id, name, email, role, active: true };
}

async function upsertAdmin({ name, email, passwordHash }) {
  if (!db) {
    const existing = localUsers.get(email);
    localUsers.set(email, {
      id: existing?.id || nextLocalId++,
      name,
      email,
      password_hash: passwordHash,
      role: "admin",
      active: true,
    });
    return;
  }
  await db.query(
    `INSERT INTO users (name, email, password_hash, role, active)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       active = TRUE`,
    [name, email, passwordHash],
  );
}

module.exports = {
  createDemoStudents,
  createUser,
  findActiveUserByEmail,
  getDemoAccounts,
  initializeLocalAdmin,
  listActiveFaculty,
  listUsers,
  seedDemoAccounts,
  upsertAdmin,
};
