const express = require("express");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const { Pool } = require("pg");

const app = express();

/* ───────────────────── CONFIG ───────────────────── */

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
    : ["http://localhost:5173", "http://localhost", "http://localhost:80"],
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "auth_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  }
};

/* ───────────────────── MIDDLEWARE ───────────────────── */

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json());

/* ───────────────────── DATABASE ───────────────────── */

const pool = new Pool({
  ...config.db,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/* ───────────────────── ROUTES ───────────────────── */

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    timestamp: new Date().toISOString()
  });
});

/* ───── REGISTER ───── */
app.post("/register", async (req, res) => {
  const { full_name, email, password, role, societyId } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({
      error: "full_name, email, password and role are required"
    });
  }

  const allowedRoles = ["CLIENT", "AGENT", "ADMIN"];
  if (!allowedRoles.includes(role.toUpperCase())) {
    return res.status(400).json({
      error: "Invalid role. Must be CLIENT, AGENT or ADMIN"
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, role, society_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role
      `,
      [
        full_name,
        email.trim().toLowerCase(),
        passwordHash,
        role.toUpperCase(),
        societyId || null
      ]
    );

    const newUser = result.rows[0];

    // 🔯োগ Optional sync with user-service (non-blocking)
    try {
      await fetch("http://user-service:3003/internal/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newUser.id,
          full_name,
          email: email.trim().toLowerCase(),
          role: role.toUpperCase(),
          society_id: societyId || null
        })
      });
    } catch (err) {
      console.warn("⚠️ user-service sync failed:", err.message);
    }

    res.status(201).json(newUser);

  } catch (err) {
    console.error("Register error:", err);

    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

/* ───── LOGIN ───── */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required"
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, full_name, email, password_hash, role, society_id
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
      `,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const { password_hash, ...safeUser } = user;
    res.json(safeUser);

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ───────────────────── SERVER ───────────────────── */

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`✅ auth-service running on port ${config.port}`);
});

/* ───────────────────── SHUTDOWN ───────────────────── */

const shutdown = (signal) => {
  console.log(`${signal} received — shutting down`);
  server.close(() => {
    pool.end(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
