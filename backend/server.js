// backend/server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- File Upload Configuration (Multer) ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    // Append the timestamp to prevent file name collisions
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Serve uploaded files statically so the frontend can display/download them
app.use('/uploads', express.static(uploadDir));
// ------------------------------------------

const pool = new Pool({
  user: "postgres",
  host: "db", // Change to "localhost" if running outside of Docker
  database: "ticketing",
  password: "postgres",
  port: 5432,
});

const normalizeRole = (role) => (role || "").toUpperCase().trim();

const toSafeInteger = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const ensureAdmin = async (candidateId) => {
  const adminId = toSafeInteger(candidateId);

  if (adminId === null) {
    return { ok: false, status: 400, message: "Valid adminId is required" };
  }

  try {
    const result = await pool.query(`SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`, [adminId]);

    if (result.rows.length === 0) {
      return { ok: false, status: 400, message: "Invalid administrator" };
    }

    const role = normalizeRole(result.rows[0].role);
    if (role !== "ADMIN") {
      return { ok: false, status: 403, message: "Administrator privileges required" };
    }

    return { ok: true, adminId };
  } catch (err) {
    console.error("ensureAdmin lookup error:", err);
    return { ok: false, status: 500, message: "Failed to verify administrator" };
  }
};

const sanitizeText = (value, { maxLength = 120 } = {}) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const sanitizeEmail = (value, { maxLength = 255 } = {}) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, maxLength);
};

/* -------- DELETE TICKET (ADMIN ONLY) - SOFT DELETE -------- */
app.delete("/tickets/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!Number.isInteger(Number(userId))) {
    return res.status(400).json({ error: "Valid userId is required" });
  }

  try {
    const userResult = await pool.query(`SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid user" });
    }

    const role = (userResult.rows[0].role || "").toUpperCase().trim();

    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can delete tickets" });
    }

    await pool.query("BEGIN");
    
    // Soft delete associated comments and attachments
    await pool.query(`UPDATE comments SET deleted_at = NOW() WHERE ticket_id = $1`, [id]);
    await pool.query(`UPDATE attachments SET deleted_at = NOW() WHERE ticket_id = $1`, [id]);
    
    // Soft delete the ticket
    const deleteResult = await pool.query(`UPDATE tickets SET deleted_at = NOW() WHERE id = $1 RETURNING id`, [id]);

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

/* -------- SOCIETIES -------- */
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

/* -------- REGISTER -------- */
app.post("/register", async (req, res) => {
  const { full_name, email, password, role, societyId } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, society_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,email,role`,
      [full_name, email, hash, role, societyId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "User exists or bad data" });
  }
});

/* LOG IN  */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT id, full_name, email, password_hash, role, society_id FROM users WHERE email = $1 AND deleted_at IS NULL",
      [email]
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------- CREATE TICKET -------- */
app.post("/tickets", async (req, res) => {
  const {
    title, description, product, category, department, priority, urgency, userId, userRole, userSocietyId
  } = req.body;

  if (!["CLIENT", "AGENT"].includes(userRole)) {
    return res.status(403).json({ error: "Unauthorized role" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO tickets
      (title, description, product, category, department, priority, urgency, status, created_by, society_id)
      VALUES ($1,$2,$3,$4,$5,UPPER($6)::ticket_priority,$7,'OPEN',$8,$9)
      RETURNING *
      `,
      [
        title, description, product, category, department, priority, urgency || null, userId,
        userRole === "CLIENT" ? userSocietyId : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

/* -------- GET TICKETS (filtered by role/user) -------- */
app.get("/tickets", async (req, res) => {
  const { userId, role } = req.query;

  try {
    let result;

    if (role && role.toUpperCase() === "CLIENT") {
      result = await pool.query(
        `
        SELECT
          t.id, t.title, t.description, t.product, t.category, t.department, t.priority, t.urgency, t.status, t.created_at, t.updated_at,
          u.full_name AS created_by_name, a.full_name AS assigned_agent_name
        FROM tickets t
        JOIN users u ON t.created_by = u.id
        LEFT JOIN users a ON t.assigned_agent_id = a.id
        WHERE t.created_by = $1 AND t.deleted_at IS NULL
        ORDER BY t.created_at DESC
        `,
        [userId]
      );
    } else if (role && role.toUpperCase() === "AGENT") {
      result = await pool.query(
        `
        SELECT
          t.id, t.title, t.description, t.product, t.category, t.department, t.priority, t.urgency, t.status, t.created_at, t.updated_at,
          u.full_name AS created_by_name, a.full_name AS assigned_agent_name
        FROM tickets t
        JOIN users u ON t.created_by = u.id
        LEFT JOIN users a ON t.assigned_agent_id = a.id
        WHERE (t.assigned_agent_id = $1 OR t.assigned_agent_id IS NULL) AND t.deleted_at IS NULL
        ORDER BY t.created_at DESC
        `,
        [userId]
      );
    } else {
      result = await pool.query(
        `
        SELECT
          t.id, t.title, t.description, t.product, t.category, t.department, t.priority, t.urgency, t.status, t.created_at, t.updated_at,
          u.full_name AS created_by_name, a.full_name AS assigned_agent_name
        FROM tickets t
        JOIN users u ON t.created_by = u.id
        LEFT JOIN users a ON t.assigned_agent_id = a.id
        WHERE t.deleted_at IS NULL
        ORDER BY t.created_at DESC
        LIMIT 50
        `
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

/* -------- GET LATEST TICKETS (ADMIN / AGENT) -------- */
app.get("/tickets/latest", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.title, t.status, t.priority, t.created_at,
        u.full_name AS created_by_name,
        a.full_name AS assigned_agent_name
      FROM tickets t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_agent_id = a.id
      WHERE t.deleted_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching latest tickets:", err);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

/* -------- GET AGENTS -------- */
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

/* -------- ASSIGN TICKET -------- */
app.put("/tickets/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE tickets
      SET assigned_agent_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
      `,
      [agentId, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign ticket" });
  }
});

/* -------- UPDATE TICKET STATUS -------- */
app.put("/tickets/:id/status", async (req, res) => {
  const { id } = req.params;
  const { userId, status } = req.body;

  const normalizedStatus = typeof status === "string" ? status.toUpperCase().trim() : "";
  const allowedStatuses = new Set(["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED"]);

  if (!Number.isInteger(Number(userId))) {
    return res.status(400).json({ error: "Valid userId is required" });
  }

  if (!allowedStatuses.has(normalizedStatus)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const ticketResult = await pool.query(
      `SELECT assigned_agent_id FROM tickets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const assignedAgentId = ticketResult.rows[0].assigned_agent_id;

    const userResult = await pool.query(`SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid user" });
    }

    const role = (userResult.rows[0].role || "").toUpperCase().trim();

    if (role === "AGENT" && assignedAgentId !== Number(userId)) {
      return res.status(403).json({ error: "Only the assigned agent can update this ticket" });
    }

    if (role !== "AGENT" && role !== "ADMIN") {
      return res.status(403).json({ error: "Only assigned agents or admins can update status" });
    }

    const updateResult = await pool.query(
      `
      UPDATE tickets
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, status, updated_at
      `,
      [normalizedStatus, id]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update ticket status" });
  }
});

/* -------- GET TICKET DETAILS -------- */
app.get("/tickets/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        t.id, t.title, t.description, t.status, t.priority, t.urgency, t.created_at, t.updated_at, t.created_by, t.assigned_agent_id,
        u.full_name AS created_by_name, a.full_name AS assigned_agent_name
      FROM tickets t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_agent_id = a.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Ticket details error:", err);
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

/* -------- GET TICKET COMMENTS & ATTACHMENTS -------- */
app.get("/tickets/:id/comments", async (req, res) => {
  const { id } = req.params;

  try {
    // We can fetch comments and simple attachments related to the ticket here
    const commentsResult = await pool.query(
      `
      SELECT 
        c.id, c.content AS text, c.created_at, 
        u.full_name AS author_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      `,
      [id]
    );

    const attachmentsResult = await pool.query(
      `
      SELECT id, file_name, file_path, file_size, content_type, created_at 
      FROM attachments 
      WHERE ticket_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC
      `,
      [id]
    );

    res.json({
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows
    });
  } catch (err) {
    console.error("Error fetching comments/attachments:", err);
    res.status(500).json({ error: "Failed to fetch comments and attachments" });
  }
});

/* -------- ADD COMMENT -------- */
app.post("/tickets/:id/comments", async (req, res) => {
  const { id } = req.params;
  const rawUserId = req.body.userId ?? req.body.user_id;
  const rawContent =
    typeof req.body.content === "string" ? req.body.content :
    typeof req.body.text === "string" ? req.body.text :
    typeof req.body.comment === "string" ? req.body.comment : "";

  const userId = Number(rawUserId);
  const content = rawContent.trim();

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: "Valid userId is required" });
  }

  if (!content) {
    return res.status(400).json({ error: "Comment content required" });
  }

  try {
    const userResult = await pool.query(`SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid user" });
    }

    const role = (userResult.rows[0].role || "").toUpperCase().trim();

    const ticketResult = await pool.query(
      `SELECT assigned_agent_id, created_by FROM tickets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const { assigned_agent_id: assignedAgentId, created_by: createdBy } = ticketResult.rows[0];

    if (role === "ADMIN") {
      return res.status(403).json({ error: "Admins cannot add comments" });
    }

    if (role === "AGENT" && assignedAgentId !== userId) {
      return res.status(403).json({ error: "Only the assigned agent can comment on this ticket" });
    }

    if (role === "CLIENT" && createdBy !== userId) {
      return res.status(403).json({ error: "Clients can only comment on their own tickets" });
    }

    const result = await pool.query(
      `
      INSERT INTO comments (ticket_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, ticket_id, user_id, content, created_at
      `,
      [id, userId, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

/* -------- UPLOAD ATTACHMENT -------- */
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
      `
      INSERT INTO attachments (ticket_id, uploaded_by, file_name, file_path, file_size, content_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [id, userId, file.originalname, `/uploads/${file.filename}`, file.size, file.mimetype]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error uploading attachment:", err);
    if (file) fs.unlinkSync(file.path);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
});

/* -------- ADMIN: LIST USERS -------- */
app.get("/users", async (req, res) => {
  const { adminId } = req.query;
  const check = await ensureAdmin(adminId);

  if (!check.ok) {
    return res.status(check.status).json({ error: check.message });
  }

  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.role, u.society_id, u.created_at,
        COALESCE(created_stats.total_created, 0)        AS created_total,
        COALESCE(created_stats.open_created, 0)         AS created_open,
        COALESCE(created_stats.in_progress_created, 0)  AS created_in_progress,
        COALESCE(created_stats.closed_created, 0)       AS created_closed,
        COALESCE(assigned_stats.total_assigned, 0)      AS assigned_total,
        COALESCE(assigned_stats.open_assigned, 0)       AS assigned_open,
        COALESCE(assigned_stats.in_progress_assigned,0) AS assigned_in_progress,
        COALESCE(assigned_stats.closed_assigned, 0)     AS assigned_closed
      FROM users u
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)                                           AS total_created,
          COUNT(*) FILTER (WHERE status = 'OPEN')            AS open_created,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')     AS in_progress_created,
          COUNT(*) FILTER (WHERE status = 'CLOSED')          AS closed_created
        FROM tickets
        WHERE created_by = u.id AND deleted_at IS NULL
      ) created_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)                                           AS total_assigned,
          COUNT(*) FILTER (WHERE status = 'OPEN')            AS open_assigned,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')     AS in_progress_assigned,
          COUNT(*) FILTER (WHERE status = 'CLOSED')          AS closed_assigned
        FROM tickets
        WHERE assigned_agent_id = u.id AND deleted_at IS NULL
      ) assigned_stats ON TRUE
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

/* -------- ADMIN: USER TICKETS -------- */
app.get("/users/:id/tickets", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.query;

  const check = await ensureAdmin(adminId);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.message });
  }

  const targetId = toSafeInteger(id);
  if (targetId === null) {
    return res.status(400).json({ error: "Valid user id is required" });
  }

  try {
    const createdResult = await pool.query(
      `
      SELECT
        t.id, t.title, t.description, t.product, t.category, t.department, t.priority, t.urgency, t.status, t.created_at, t.updated_at,
        u.full_name AS created_by_name, a.full_name AS assigned_agent_name
      FROM tickets t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_agent_id = a.id
      WHERE t.created_by = $1 AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 100
      `,
      [targetId]
    );

    const assignedResult = await pool.query(
      `
      SELECT
        t.id, t.title, t.description, t.product, t.category, t.department, t.priority, t.urgency, t.status, t.created_at, t.updated_at,
        u.full_name AS created_by_name, a.full_name AS assigned_agent_name
      FROM tickets t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_agent_id = a.id
      WHERE t.assigned_agent_id = $1 AND t.deleted_at IS NULL
      ORDER BY t.updated_at DESC
      LIMIT 100
      `,
      [targetId]
    );

    res.json({ created: createdResult.rows, assigned: assignedResult.rows });
  } catch (err) {
    console.error("Admin user tickets error:", err);
    res.status(500).json({ error: "Failed to fetch user tickets" });
  }
});

/* -------- ADMIN: DELETE USER - SOFT DELETE -------- */
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body || {};

  const check = await ensureAdmin(adminId);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.message });
  }

  const targetId = toSafeInteger(id);
  if (targetId === null) {
    return res.status(400).json({ error: "Valid user id is required" });
  }

  if (targetId === check.adminId) {
    return res.status(400).json({ error: "Administrators cannot delete themselves" });
  }

  try {
    await pool.query("BEGIN");

    await pool.query(`UPDATE tickets SET assigned_agent_id = NULL WHERE assigned_agent_id = $1`, [targetId]);
    await pool.query(`UPDATE comments SET deleted_at = NOW() WHERE user_id = $1`, [targetId]);
    await pool.query(`UPDATE tickets SET deleted_at = NOW() WHERE created_by = $1`, [targetId]);

    const deleteResult = await pool.query(`UPDATE users SET deleted_at = NOW() WHERE id = $1 RETURNING id`, [targetId]);

    if (deleteResult.rows.length === 0) {
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

/* -------- ADMIN: MANAGE COMPANIES -------- */
app.get("/companies", async (req, res) => {
  const { adminId } = req.query;
  const check = await ensureAdmin(adminId);

  if (!check.ok) {
    return res.status(check.status).json({ error: check.message });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, name, type, contact_email, created_at, updated_at
      FROM societies
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 200
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin companies fetch error:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

app.post("/companies", async (req, res) => {
  const { adminId, name, contactEmail, type } = req.body || {};

  const check = await ensureAdmin(adminId);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.message });
  }

  const companyName = sanitizeText(name, { maxLength: 120 });
  const companyType = sanitizeText(type, { maxLength: 60 }).toLowerCase();
  const companyContactEmail = sanitizeEmail(contactEmail);

  if (!companyName) {
    return res.status(400).json({ error: "Company name is required" });
  }

  if (!companyType || !["client", "tech"].includes(companyType)) {
    return res.status(400).json({ error: "Type must be either 'client' or 'tech'" });
  }

  if (companyContactEmail && !companyContactEmail.includes("@")) {
    return res.status(400).json({ error: "Provide a valid contact email or leave it blank" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO societies (name, type, contact_email)
      VALUES ($1, $2, NULLIF($3, ''))
      RETURNING id, name, type, contact_email, created_at, updated_at
      `,
      [companyName, companyType, companyContactEmail || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Admin create company error:", err);
    res.status(500).json({ error: "Failed to create company" });
  }
});

/* -------- ADMIN: DELETE COMPANY - SOFT DELETE -------- */
app.delete("/companies/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body || {};

  const check = await ensureAdmin(adminId);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.message });
  }

  const companyId = toSafeInteger(id);
  if (companyId === null) {
    return res.status(400).json({ error: "Valid company id is required" });
  }

  try {
    const ticketsResult = await pool.query(
      `SELECT COUNT(*) AS ticket_count FROM tickets WHERE society_id = $1 AND deleted_at IS NULL`,
      [companyId]
    );

    const ticketCount = Number(ticketsResult.rows[0]?.ticket_count || 0);
    if (ticketCount > 0) {
      return res.status(400).json({ error: "Cannot delete company with existing tickets" });
    }

    const deleteResult = await pool.query(
      `UPDATE societies SET deleted_at = NOW() WHERE id = $1 RETURNING id`,
      [companyId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ message: "Company soft-deleted" });
  } catch (err) {
    console.error("Admin delete company error:", err);
    res.status(500).json({ error: "Failed to delete company" });
  }
});

app.listen(5000, () =>
  console.log("Backend running on http://localhost:5000")
);