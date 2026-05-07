const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();


/* ───────────────────── CONFIG ───────────────────── */

const config = {
  port: parseInt(process.env.PORT, 10) || 3004,
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
    service: "product-service",
    timestamp: new Date().toISOString()
  });
});

/* ───── GET ALL PRODUCTS ───── */
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, vendor, category, specification, created_at, updated_at
       FROM products
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      error: "Failed to fetch products"
    });
  }
});

/* ───── GET SINGLE PRODUCT ───── */
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, description, vendor, category, specification, created_at, updated_at
       FROM products
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      error: "Failed to fetch product"
    });
  }
});

/* ───── CREATE PRODUCT ───── */
app.post("/products", async (req, res) => {
  const { name, description, vendor, category, specification } = req.body;

  if (!name || !vendor || !category) {
    return res.status(400).json({
      error: "name, vendor, and category are required"
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, vendor, category, specification)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, vendor, category, specification, created_at, updated_at`,
      [name, description || null, vendor, category, specification || null]
    );

    const newProduct = result.rows[0];

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      error: "Failed to create product"
    });
  }
});

/* ───── UPDATE PRODUCT ───── */
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, vendor, category, specification } = req.body;

  if (!name || !vendor || !category) {
    return res.status(400).json({
      error: "name, vendor, and category are required"
    });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET name = $1, description = $2, vendor = $3, category = $4, specification = $5, updated_at = NOW()
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING id, name, description, vendor, category, specification, created_at, updated_at`,
      [name, description || null, vendor, category, specification || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      error: "Failed to update product"
    });
  }
});

/* ───── DELETE PRODUCT (Soft Delete) ───── */
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE products
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      error: "Failed to delete product"
    });
  }
});

/* ───────────────────── SERVER START ───────────────────── */

app.listen(config.port, () => {
  console.log(`✅ Product Service listening on port ${config.port}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing gracefully...");
  pool.end(() => {
    process.exit(0);
  });
});
