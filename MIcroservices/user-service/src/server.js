const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

const config = {
  port: parseInt(process.env.PORT, 10) || 3003,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:80", "http://localhost"],
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "user_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

const pool = new Pool({
  ...config.db,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const toSafeInteger = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const ensureAdmin = async (candidateId) => {
  const adminId = toSafeInteger(candidateId);
  if (adminId === null) return { ok: false, status: 400, message: "Valid adminId is required" };
  try {
    const result = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`, [adminId]
    );
    if (result.rows.length === 0) return { ok: false, status: 400, message: "Invalid administrator" };
    if ((result.rows[0].role || "").toUpperCase() !== "ADMIN")
      return { ok: false, status: 403, message: "Administrator privileges required" };
    return { ok: true, adminId };
  } catch (err) {
    return { ok: false, status: 500, message: "Failed to verify administrator" };
  }
};

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "user-service", timestamp: new Date().toISOString() });
});

// ─── GET SOCIETIES (public, used in register form) ────────────────────────────
app.get("/societies", async (req, res) => {
  const { type } = req.query;
  try {
    const result = await pool.query(
      "SELECT id, name FROM societies WHERE LOWER(type) = LOWER($1) AND deleted_at IS NULL",
      [type]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ─── GET AGENTS (used by ticket-service via gateway) ──────────────────────────
app.get("/agents", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name FROM users WHERE role = 'AGENT' AND deleted_at IS NULL"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// ─── ADMIN: LIST USERS ────────────────────────────────────────────────────────
app.get("/users", async (req, res) => {
  const { adminId } = req.query;
  const check = await ensureAdmin(adminId);
  if (!check.ok) return res.status(check.status).json({ error: check.message });

  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.role, u.society_id, u.created_at,
        COALESCE(s.name, '') AS society_name
      FROM users u
      LEFT JOIN societies s ON u.society_id = s.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 500
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Admin users fetch error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─── ADMIN: DELETE USER ───────────────────────────────────────────────────────
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body || {};

  const check = await ensureAdmin(adminId);
  if (!check.ok) return res.status(check.status).json({ error: check.message });

  const targetId = toSafeInteger(id);
  if (targetId === null) return res.status(400).json({ error: "Valid user id is required" });
  if (targetId === check.adminId) return res.status(400).json({ error: "Administrators cannot delete themselves" });

  try {
    await pool.query("BEGIN");
    await pool.query(`UPDATE users SET deleted_at = NOW() WHERE id = $1`, [targetId]);
    const result = await pool.query(`SELECT id FROM users WHERE id = $1`, [targetId]);
    if (result.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }
    await pool.query("COMMIT");
    res.json({ message: "User soft-deleted" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ─── ADMIN: LIST COMPANIES ────────────────────────────────────────────────────
app.get("/companies", async (req, res) => {
  const { adminId } = req.query;
  const check = await ensureAdmin(adminId);
  if (!check.ok) return res.status(check.status).json({ error: check.message });

  try {
    const result = await pool.query(
      `SELECT id, name, type, contact_email, created_at, updated_at
       FROM societies WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// ─── ADMIN: CREATE COMPANY ────────────────────────────────────────────────────
app.post("/companies", async (req, res) => {
  const { adminId, name, contactEmail, type } = req.body || {};
  const check = await ensureAdmin(adminId);
  if (!check.ok) return res.status(check.status).json({ error: check.message });

  const companyName = (name || "").trim().slice(0, 120);
  const companyType = (type || "").trim().toLowerCase();
  const companyEmail = (contactEmail || "").trim().toLowerCase();

  if (!companyName) return res.status(400).json({ error: "Company name is required" });
  if (!["client", "tech"].includes(companyType)) return res.status(400).json({ error: "Type must be client or tech" });

  try {
    const result = await pool.query(
      `INSERT INTO societies (name, type, contact_email)
       VALUES ($1, $2, NULLIF($3, ''))
       RETURNING id, name, type, contact_email, created_at`,
      [companyName, companyType, companyEmail || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create company" });
  }
});

// ─── ADMIN: DELETE COMPANY ────────────────────────────────────────────────────
app.delete("/companies/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body || {};
  const check = await ensureAdmin(adminId);
  if (!check.ok) return res.status(check.status).json({ error: check.message });

  const companyId = toSafeInteger(id);
  if (companyId === null) return res.status(400).json({ error: "Valid company id is required" });

  try {
    const deleteResult = await pool.query(
      `UPDATE societies SET deleted_at = NOW() WHERE id = $1 RETURNING id`, [companyId]
    );
    if (deleteResult.rows.length === 0) return res.status(404).json({ error: "Company not found" });
    res.json({ message: "Company soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete company" });
  }
});
// ─── INTERNAL: Sync user to ticket-service ────────────────────────────────────
app.post("/internal/sync-user", async (req, res) => {
  const { id, full_name, role, society_id } = req.body;
  if (!id || !full_name || !role) {
    return res.status(400).json({ error: "id, full_name and role are required" });
  }

  // Sync to ticket-db via ticket-service internal endpoint
  try {
    await fetch(`http://ticket-service:3002/internal/sync-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, full_name, role })
    });
  } catch (err) {
    console.warn("Sync to ticket-service failed:", err.message);
  }

  res.json({ ok: true });
});
// ─── Graceful shutdown ────────────────────────────────────────────────────────
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`✅ user-service running on port ${config.port}`);
});

const shutdown = (signal) => {
  server.close(() => pool.end(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
