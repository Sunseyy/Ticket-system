const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();

const config = {
  port: parseInt(process.env.PORT, 10) || 3004,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:80", "http://localhost"],
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "attachment_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads"),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
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

// ─── Multer setup ─────────────────────────────────────────────────────────────
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage, limits: { fileSize: config.maxFileSize } });

app.use("/uploads", express.static(config.uploadDir));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "attachment-service", timestamp: new Date().toISOString() });
});

// ─── UPLOAD ATTACHMENT ────────────────────────────────────────────────────────
app.post("/tickets/:id/attachments", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const rawUserId = req.body.userId ?? req.body.user_id;
  const userId = Number(rawUserId);
  const file = req.file;

  if (!Number.isInteger(userId)) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ error: "Valid userId is required" });
  }

  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO attachments (ticket_id, uploaded_by, file_name, file_path, file_size, content_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, userId, file.originalname, `/uploads/${file.filename}`, file.size, file.mimetype]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error uploading attachment:", err);
    if (file) fs.unlinkSync(file.path);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
});

// ─── GET ATTACHMENTS FOR TICKET ───────────────────────────────────────────────
app.get("/tickets/:id/attachments", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, file_name, file_path, file_size, content_type, created_at
       FROM attachments
       WHERE ticket_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching attachments:", err);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// ─── DELETE ATTACHMENT ────────────────────────────────────────────────────────
app.delete("/attachments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE attachments SET deleted_at = NOW() WHERE id = $1 RETURNING id`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Attachment not found" });
    res.json({ message: "Attachment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`✅ attachment-service running on port ${config.port}`);
});

const shutdown = (signal) => {
  server.close(() => pool.end(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
