const { Pool } = require("pg");
require("dotenv").config();

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "astral_sharks",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on("connect", () => {
  console.log("[database] Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("[database] Unexpected error on idle client", err);
  process.exit(-1);
});

// Database helper functions
const db = {
  // Test connection
  async testConnection() {
    try {
      const result = await pool.query("SELECT NOW()");
      return result.rows[0];
    } catch (error) {
      console.error("[database] Connection test failed:", error);
      throw error;
    }
  },

  // User operations
  async createUser(userData) {
    const { username, email, password_hash, full_name, phone } = userData;
    const query = `
      INSERT INTO users (username, email, password_hash, full_name, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, phone, created_at
    `;
    const values = [username, email, password_hash, full_name, phone];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getUserByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1 AND is_active = true";
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  async getUserById(id) {
    const query =
      "SELECT id, username, email, full_name, phone, created_at FROM users WHERE id = $1 AND is_active = true";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // SOS incidents
  async createSOSIncident(incidentData) {
    const {
      user_id,
      emergency_id,
      latitude,
      longitude,
      battery_level,
      network_type,
      device_info,
    } = incidentData;
    const query = `
      INSERT INTO sos_incidents (user_id, emergency_id, latitude, longitude, battery_level, network_type, device_info)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      user_id,
      emergency_id,
      latitude,
      longitude,
      battery_level,
      network_type,
      JSON.stringify(device_info),
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getActiveSOSIncidents() {
    const query = `
      SELECT si.*, u.full_name, u.phone
      FROM sos_incidents si
      LEFT JOIN users u ON si.user_id = u.id
      WHERE si.status = 'active'
      ORDER BY si.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async resolveSOSIncident(emergency_id) {
    const query = `
      UPDATE sos_incidents 
      SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
      WHERE emergency_id = $1 AND status = 'active'
      RETURNING *
    `;
    const result = await pool.query(query, [emergency_id]);
    return result.rows[0];
  },

  // Incident reports
  async createIncidentReport(reportData) {
    const {
      user_id,
      incident_type,
      latitude,
      longitude,
      title,
      description,
      threat_level,
      receipt_hash,
    } = reportData;
    const query = `
      INSERT INTO incident_reports (user_id, incident_type, latitude, longitude, title, description, threat_level, receipt_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      user_id,
      incident_type,
      latitude,
      longitude,
      title,
      description,
      threat_level,
      receipt_hash,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getIncidentReports(filters = {}) {
    let query = `
      SELECT ir.*, u.full_name
      FROM incident_reports ir
      LEFT JOIN users u ON ir.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (filters.incident_type) {
      query += ` AND ir.incident_type = $${paramIndex++}`;
      values.push(filters.incident_type);
    }

    if (filters.status) {
      query += ` AND ir.status = $${paramIndex++}`;
      values.push(filters.status);
    }

    query += " ORDER BY ir.created_at DESC";

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  },

  async updateIncidentStatus(id, status) {
    const query = `
      UPDATE incident_reports 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  },

  // Safe zones
  async getSafeZones(userId) {
    const query =
      "SELECT * FROM safe_zones WHERE user_id = $1 AND is_active = true ORDER BY name";
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async createSafeZone(zoneData) {
    const { user_id, name, latitude, longitude, radius_meters } = zoneData;
    const query = `
      INSERT INTO safe_zones (user_id, name, latitude, longitude, radius_meters)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [user_id, name, latitude, longitude, radius_meters];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Family groups
  async getFamilyGroups(userId) {
    const query = `
      SELECT fg.*, fm.role
      FROM family_groups fg
      JOIN family_members fm ON fg.id = fm.family_group_id
      WHERE fm.user_id = $1
      ORDER BY fg.name
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async getFamilyMembers(groupId) {
    const query = `
      SELECT u.id, u.username, u.full_name, u.phone, fm.role, fm.joined_at
      FROM users u
      JOIN family_members fm ON u.id = fm.user_id
      WHERE fm.family_group_id = $1 AND u.is_active = true
      ORDER BY fm.role DESC, u.full_name
    `;
    const result = await pool.query(query, [groupId]);
    return result.rows;
  },

  // Location history
  async saveLocationHistory(locationData) {
    const {
      user_id,
      latitude,
      longitude,
      accuracy,
      battery_level,
      network_type,
    } = locationData;
    const query = `
      INSERT INTO location_history (user_id, latitude, longitude, accuracy, battery_level, network_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      user_id,
      latitude,
      longitude,
      accuracy,
      battery_level,
      network_type,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getLocationHistory(userId, limit = 100) {
    const query = `
      SELECT * FROM location_history
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  },

  // Close the pool (for graceful shutdown)
  async close() {
    await pool.end();
    console.log("[database] Connection pool closed");
  },
};

module.exports = db;
module.exports.pool = pool;
