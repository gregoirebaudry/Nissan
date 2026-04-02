const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS car_location (
      id SERIAL PRIMARY KEY,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      updated_by TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
initDB();

app.get("/location", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM car_location ORDER BY updated_at DESC LIMIT 1"
  );
  res.json(result.rows[0] || {});
});

app.post("/location", async (req, res) => {
  const { latitude, longitude, updatedBy } = req.body;

  await pool.query(
    `INSERT INTO car_location (latitude, longitude, updated_by)
     VALUES ($1, $2, $3)`,
    [latitude, longitude, updatedBy]
  );

  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
