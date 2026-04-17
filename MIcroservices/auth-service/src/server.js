const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:80", "http://localhost"],
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "auth_db",
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

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "auth-service", timestamp: new Date().toISOString() });
});

// ─── Helper: Normalize email ───────────────────────────────────────────────
const normalizeEmail = (email) => {
  return (email || "").trim().toLowerCase();
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  const { full_name, email, password, role, societyId } = req.body;

  // Normalize email for comparison and storage
  const normalizedEmail = normalizeEmail(email);

  if (!full_name || !normalizedEmail || !password || !role) {
    return res.status(400).json({ error: "full_name, email, password and role are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const allowedRoles = ["CLIENT", "AGENT", "ADMIN"];
  if (!allowedRoles.includes(role.toUpperCase())) {
    return res.status(400).json({ error: "Invalid role. Must be CLIENT, AGENT or ADMIN" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, society_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, society_id`,
      [full_name, normalizedEmail, hash, role.toUpperCase(), societyId || null]
    );

    const newUser = result.rows[0];
    res.status(201).json({ 
      message: "User registered successfully",
      user: newUser 
    });
  } catch (err) {
    console.error("Register error:", err);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role, society_id
       FROM users
       WHERE LOWER(email) = $1 AND deleted_at IS NULL`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const { password_hash, ...userData } = user;
    res.json(userData);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`✅ auth-service running on port ${config.port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received — shutting down`);
  server.close(() => {
    pool.end(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
