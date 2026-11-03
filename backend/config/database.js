const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function getDatabaseConfig() {
  const ssl = process.env.PGSSL === "true"
    ? {
      rejectUnauthorized: true,
      ...(process.env.PGSSL_CA ? { ca: process.env.PGSSL_CA.replace(/\\n/g, "\n") } : {}),
    }
    : undefined;

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
    }
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\/+/, "")),
      ssl,
    };
  }

  const { PGHOST, PGUSER, PGDATABASE } = process.env;
  if (!PGHOST || !PGUSER || !PGDATABASE) {
    throw new Error("Configure DATABASE_URL or PGHOST, PGUSER and PGDATABASE.");
  }
  return {
    host: PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: PGUSER,
    password: process.env.PGPASSWORD || "",
    database: PGDATABASE,
    ssl,
  };
}

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE),
);
if (!isDatabaseConfigured && process.env.NODE_ENV === "production") {
  throw new Error("Configure DATABASE_URL or PGHOST, PGUSER and PGDATABASE before production startup.");
}

const pool = isDatabaseConfigured
  ? new Pool({
    ...getDatabaseConfig(),
    max: 10,
    idleTimeoutMillis: 30000,
  })
  : null;
pool?.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

async function initializeDatabase() {
  if (!pool) throw new Error("PostgreSQL is not configured. Set DATABASE_URL or PGHOST, PGUSER and PGDATABASE.");
  const schemaPath = path.join(__dirname, "../../schema.sql");
  const statements = fs.readFileSync(schemaPath, "utf8").split(";").map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);
}

module.exports = { db: pool, initializeDatabase, isDatabaseConfigured, pool };
