const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

const config = {
  port: parseInt(process.env.PORT, 10) || 3002,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:80", "http://localhost"],
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || "ticket_db",
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

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "ticket-service", timestamp: new Date().toISOString() });
});

// ─── CREATE TICKET ────────────────────────────────────────────────────────────
app.post("/tickets", async (req, res) => {
  const { title, description, product, category, department, priority, urgency, userId, userRole, userSocietyId } = req.body;

  if (!title || !description || !product || !category || !department) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["CLIENT", "AGENT"].includes(userRole)) {
    return res.status(403).json({ error: "Unauthorized role" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tickets
       (title, description, product, category, department, priority, urgency, status, created_by, society_id)
       VALUES ($1,$2,$3,$4,$5,UPPER($6)::ticket_priority,$7,'OPEN',$8,$9)
       RETURNING *`,
      [title, description, product, category, department, priority, urgency || null, userId,
        userRole === "CLIENT" ? userSocietyId : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// ─── GET TICKETS (filtered by role) ──────────────────────────────────────────
app.get("/tickets", async (req, res) => {
  const { userId, role } = req.query;

  try {
    let result;
    if (role && role.toUpperCase() === "CLIENT") {
      result = await pool.query(
        `SELECT t.id, t.title, t.description, t.product, t.category, t.department,
                t.priority, t.urgency, t.status, t.created_at, t.updated_at,
                u.full_name AS created_by_name, a.full_name AS assigned_agent_name
         FROM tickets t
         JOIN users u ON t.created_by = u.id
         LEFT JOIN users a ON t.assigned_agent_id = a.id
         WHERE t.created_by = $1 AND t.deleted_at IS NULL
         ORDER BY t.created_at DESC`,
        [userId]
      );
    } else if (role && role.toUpperCase() === "AGENT") {
      result = await pool.query(
        `SELECT t.id, t.title, t.description, t.product, t.category, t.department,
                t.priority, t.urgency, t.status, t.created_at, t.updated_at,
                u.full_name AS created_by_name, a.full_name AS assigned_agent_name
         FROM tickets t
         JOIN users u ON t.created_by = u.id
         LEFT JOIN users a ON t.assigned_agent_id = a.id
         WHERE (t.assigned_agent_id = $1 OR t.assigned_agent_id IS NULL) AND t.deleted_at IS NULL
         ORDER BY t.created_at DESC`,
        [userId]
      );
    } else {
      result = await pool.query(
        `SELECT t.id, t.title, t.description, t.product, t.category, t.department,
                t.priority, t.urgency, t.status, t.created_at, t.updated_at,
                u.full_name AS created_by_name, a.full_name AS assigned_agent_name
         FROM tickets t
         JOIN users u ON t.created_by = u.id
         LEFT JOIN users a ON t.assigned_agent_id = a.id
         WHERE t.deleted_at IS NULL
         ORDER BY t.created_at DESC
         LIMIT 50`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ─── GET LATEST TICKETS ───────────────────────────────────────────────────────
app.get("/tickets/latest", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.priority, t.created_at,
              u.full_name AS created_by_name, a.full_name AS assigned_agent_name
       FROM tickets t
       JOIN users u ON t.created_by = u.id
       LEFT JOIN users a ON t.assigned_agent_id = a.id
       WHERE t.deleted_at IS NULL
       ORDER BY t.created_at DESC
       LIMIT 5`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching latest tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// ─── GET TICKET DETAILS ───────────────────────────────────────────────────────
app.get("/tickets/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.description, t.status, t.priority, t.urgency,
              t.created_at, t.updated_at, t.created_by, t.assigned_agent_id,
              u.full_name AS created_by_name, a.full_name AS assigned_agent_name
       FROM tickets t
       JOIN users u ON t.created_by = u.id
       LEFT JOIN users a ON t.assigned_agent_id = a.id
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Ticket details error:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

// ─── GET AGENTS ───────────────────────────────────────────────────────────────
app.get("/agents", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name FROM users WHERE role = 'AGENT' AND deleted_at IS NULL"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// ─── ASSIGN TICKET ────────────────────────────────────────────────────────────
app.put("/tickets/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tickets SET assigned_agent_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [agentId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign ticket" });
  }
});

// ─── UPDATE TICKET STATUS ─────────────────────────────────────────────────────
app.put("/tickets/:id/status", async (req, res) => {
  const { id } = req.params;
  const { userId, status } = req.body;

  const normalizedStatus = typeof status === "string" ? status.toUpperCase().trim() : "";
  const allowedStatuses = new Set(["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED"]);

  if (!Number.isInteger(Number(userId))) return res.status(400).json({ error: "Valid userId is required" });
  if (!allowedStatuses.has(normalizedStatus)) return res.status(400).json({ error: "Invalid status value" });

  try {
    const ticketResult = await pool.query(
      `SELECT assigned_agent_id FROM tickets WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

    const assignedAgentId = ticketResult.rows[0].assigned_agent_id;
    const userResult = await pool.query(
      `SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]
    );
    if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid user" });

    const role = (userResult.rows[0].role || "").toUpperCase().trim();

    if (role === "AGENT" && assignedAgentId !== Number(userId))
      return res.status(403).json({ error: "Only the assigned agent can update this ticket" });
    if (role !== "AGENT" && role !== "ADMIN")
      return res.status(403).json({ error: "Only assigned agents or admins can update status" });

    const updateResult = await pool.query(
      `UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND deleted_at IS NULL RETURNING id, status, updated_at`,
      [normalizedStatus, id]
    );
    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update ticket status" });
  }
});

// ─── DELETE TICKET (ADMIN ONLY) ───────────────────────────────────────────────
app.delete("/tickets/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!Number.isInteger(Number(userId))) return res.status(400).json({ error: "Valid userId is required" });

  try {
    const userResult = await pool.query(
      `SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]
    );
    if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid user" });
    if ((userResult.rows[0].role || "").toUpperCase() !== "ADMIN")
      return res.status(403).json({ error: "Only admins can delete tickets" });

    await pool.query("BEGIN");
    await pool.query(`UPDATE comments SET deleted_at = NOW() WHERE ticket_id = $1`, [id]);
    await pool.query(`UPDATE attachments SET deleted_at = NOW() WHERE ticket_id = $1`, [id]);
    const deleteResult = await pool.query(
      `UPDATE tickets SET deleted_at = NOW() WHERE id = $1 RETURNING id`, [id]
    );
    if (deleteResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Ticket not found" });
    }
    await pool.query("COMMIT");
    res.json({ message: "Ticket deleted" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Delete ticket error:", err);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

// ─── GET COMMENTS ─────────────────────────────────────────────────────────────
app.get("/tickets/:id/comments", async (req, res) => {
  const { id } = req.params;
  try {
    const commentsResult = await pool.query(
      `SELECT c.id, c.content AS text, c.created_at, u.full_name AS author_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.ticket_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [id]
    );
    res.json({ comments: commentsResult.rows });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// ─── ADD COMMENT ──────────────────────────────────────────────────────────────
app.post("/tickets/:id/comments", async (req, res) => {
  const { id } = req.params;
  const rawUserId = req.body.userId ?? req.body.user_id;
  const rawContent =
    typeof req.body.content === "string" ? req.body.content :
    typeof req.body.text === "string" ? req.body.text :
    typeof req.body.comment === "string" ? req.body.comment : "";

  const userId = Number(rawUserId);
  const content = rawContent.trim();

  if (!Number.isInteger(userId)) return res.status(400).json({ error: "Valid userId is required" });
  if (!content) return res.status(400).json({ error: "Comment content required" });

  try {
    const userResult = await pool.query(
      `SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]
    );
    if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid user" });

    const role = (userResult.rows[0].role || "").toUpperCase().trim();
    const ticketResult = await pool.query(
      `SELECT assigned_agent_id, created_by FROM tickets WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

    const { assigned_agent_id: assignedAgentId, created_by: createdBy } = ticketResult.rows[0];

    if (role === "ADMIN") return res.status(403).json({ error: "Admins cannot add comments" });
    if (role === "AGENT" && assignedAgentId !== userId)
      return res.status(403).json({ error: "Only the assigned agent can comment on this ticket" });
    if (role === "CLIENT" && createdBy !== userId)
      return res.status(403).json({ error: "Clients can only comment on their own tickets" });

    const result = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, ticket_id, user_id, content, created_at`,
      [id, userId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`✅ ticket-service running on port ${config.port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received — shutting down`);
  server.close(() => pool.end(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
