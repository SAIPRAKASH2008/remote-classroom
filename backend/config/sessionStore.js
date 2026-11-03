const session = require("express-session");

class PostgreSQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.cleanupTimer = setInterval(() => {
      this.pool.query("DELETE FROM sessions WHERE expires <= $1", [Date.now()]).catch((error) => {
        if (error) console.error("Could not clean expired sessions:", error);
      });
    }, 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  get(sessionId, callback) {
    this.pool.query(
      "SELECT data FROM sessions WHERE session_id = $1 AND expires > $2 LIMIT 1",
      [sessionId, Date.now()],
    ).then(({ rows }) => {
      if (!rows.length) return callback(null, null);
      callback(null, JSON.parse(rows[0].data));
    }).catch(callback);
  }

  set(sessionId, value, callback = () => {}) {
    const expires = value.cookie?.expires
      ? new Date(value.cookie.expires).getTime()
      : Date.now() + (value.cookie?.maxAge || 8 * 60 * 60 * 1000);
    this.pool.query(
      `INSERT INTO sessions (session_id, expires, data) VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO UPDATE SET expires = EXCLUDED.expires, data = EXCLUDED.data`,
      [sessionId, expires, JSON.stringify(value)],
    ).then(() => callback()).catch(callback);
  }

  touch(sessionId, value, callback = () => {}) {
    const expires = value.cookie?.expires
      ? new Date(value.cookie.expires).getTime()
      : Date.now() + (value.cookie?.maxAge || 8 * 60 * 60 * 1000);
    this.pool.query(
      "UPDATE sessions SET expires = $1 WHERE session_id = $2",
      [expires, sessionId],
    ).then(() => callback()).catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    this.pool.query("DELETE FROM sessions WHERE session_id = $1", [sessionId])
      .then(() => callback())
      .catch(callback);
  }

  close() {
    clearInterval(this.cleanupTimer);
  }
}

module.exports = PostgreSQLSessionStore;
