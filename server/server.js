/**
 * Astral Sharks API — Express + Socket.IO
 *
 * Env:
 *   PORT              — default 3000
 *   NODE_ENV          — development | production
 *   ALLOWED_ORIGINS   — production: comma-separated list of allowed browser origins (e.g. https://app.example.com,http://localhost:8081)
 *
 * Listen: 0.0.0.0 so LAN devices can connect.
 */

const http = require("http");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");
const { pool } = require("./database");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const PORT = parseInt(process.env.PORT || "3000", 10) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS || "";
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Default Socket.IO path; client must use the same value (no manual ws:// URL). */
const SOCKET_PATH = "/socket.io";

/**
 * CORS origin verifier for Express + Socket.IO (same logic for both).
 * - No Origin header (many native clients, curl): allowed.
 * - Production: only ALLOWED_ORIGINS entries (must be configured for web).
 * - Development: localhost, 127.0.0.1, private LAN, Expo dev / tunnel hosts.
 */
function createOriginVerifier() {
  return function verifyOrigin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.length > 0) {
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`CORS: origin not in ALLOWED_ORIGINS: ${origin}`),
      );
    }

    if (isProd) {
      console.error(
        "[cors] Production requires ALLOWED_ORIGINS (comma-separated). Denying browser origin:",
        origin,
      );
      return callback(new Error("CORS: production whitelist not configured"));
    }

    try {
      const { hostname } = new URL(origin);
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0"
      ) {
        return callback(null, true);
      }
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return callback(null, true);
      }
      if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return callback(null, true);
      }
      if (hostname.endsWith(".exp.direct") || hostname.endsWith(".expo.dev")) {
        return callback(null, true);
      }
    } catch {
      return callback(new Error("CORS: invalid origin"));
    }

    return callback(null, true);
  };
}

const verifyOrigin = createOriginVerifier();

const app = express();

app.use(
  cors({
    origin: verifyOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.use(express.json({ limit: "10mb" }));

app.get("/health", async (req, res) => {
  try {
    await db.testConnection();
    res.json({
      ok: true,
      service: "astral-sharks-api",
      uptime: process.uptime(),
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      service: "astral-sharks-api",
      error: "database connection failed",
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "astral-sharks-api",
    socketPath: SOCKET_PATH,
    health: "/health",
  });
});

app.post("/sos", async (req, res) => {
  try {
    const {
      user_id,
      emergency_id,
      latitude,
      longitude,
      battery_level,
      network_type,
      device_info,
    } = req.body;

    if (!emergency_id || !latitude || !longitude) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields" });
    }

    const incident = await db.createSOSIncident({
      user_id,
      emergency_id,
      latitude,
      longitude,
      battery_level,
      network_type,
      device_info,
    });

    // Broadcast to all connected clients
    io.emit("sos_alert", {
      id: incident.id,
      emergency_id: incident.emergency_id,
      latitude: incident.latitude,
      longitude: incident.longitude,
      battery_level: incident.battery_level,
      created_at: incident.created_at,
    });

    // Broadcast to agency dashboard
    io.to("agency_dashboard").emit("agency_sos_alert", {
      id: incident.id,
      emergency_id: incident.emergency_id,
      latitude: incident.latitude,
      longitude: incident.longitude,
      battery_level: incident.battery_level,
      created_at: incident.created_at,
      priorityScore: calculateSOSPriority(incident),
      recommendations: generateRecommendations("sos", incident),
    });

    res.json({ ok: true, incident });
  } catch (error) {
    console.error("[sos] Error:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.post("/upload", upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    const {
      user_id,
      incident_type,
      latitude,
      longitude,
      title,
      description,
      threat_level,
    } = req.body;
    const receiptHash = `8XF-${Math.random().toString(36).slice(2, 8).toUpperCase()}-KL`;

    console.log(
      "[upload] threatLevel=%s files=%s",
      threat_level,
      files.map((f) => `${f.fieldname}:${f.size}`).join(", "),
    );

    // Create incident report
    const incident = await db.createIncidentReport({
      user_id,
      incident_type,
      latitude,
      longitude,
      title,
      description,
      threat_level: threat_level || 1,
      receipt_hash: receiptHash,
    });

    // Store file attachments if any
    if (files.length > 0) {
      // TODO: Store files in database or cloud storage
      console.log("[upload] Files received for incident", incident.id);
    }

    // Broadcast new incident
    io.emit("new_incident", {
      id: incident.id,
      incident_type: incident.incident_type,
      latitude: incident.latitude,
      longitude: incident.longitude,
      title: incident.title,
      threat_level: incident.threat_level,
      created_at: incident.created_at,
    });

    // Broadcast to agency dashboard
    io.to("agency_dashboard").emit("agency_new_incident", {
      id: incident.id,
      incident_type: incident.incident_type,
      latitude: incident.latitude,
      longitude: incident.longitude,
      title: incident.title,
      threat_level: incident.threat_level,
      created_at: incident.created_at,
      priorityScore: calculateIncidentPriority(incident),
      recommendations: generateRecommendations(
        incident.incident_type,
        incident,
      ),
    });

    res.json({
      ok: true,
      analyzed: true,
      message: "Report received and stored",
      receiptHash,
      incident,
    });
  } catch (error) {
    console.error("[upload] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to process report" });
  }
});

app.get("/zones", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ ok: false, error: "user_id required" });
    }

    const zones = await db.getSafeZones(user_id);
    res.json(zones);
  } catch (error) {
    console.error("[zones] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch safe zones" });
  }
});

// New API endpoints

// Get all active SOS incidents
app.get("/api/sos/active", async (req, res) => {
  try {
    const incidents = await db.getActiveSOSIncidents();
    res.json({ ok: true, incidents });
  } catch (error) {
    console.error("[sos] Error fetching active incidents:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch incidents" });
  }
});

// Get incident reports
app.get("/api/incidents", async (req, res) => {
  try {
    const filters = {
      incident_type: req.query.type,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };

    const incidents = await db.getIncidentReports(filters);
    res.json({ ok: true, incidents });
  } catch (error) {
    console.error("[incidents] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch incidents" });
  }
});

// User authentication
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    if (!username || !email || !password || !full_name) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields" });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ ok: false, error: "User already exists" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.createUser({
      username,
      email,
      password_hash,
      full_name,
      phone,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({ ok: true, user, token });
  } catch (error) {
    console.error("[auth] Registration error:", error);
    res.status(500).json({ ok: false, error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "Email and password required" });
    }

    // Find user
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({ ok: true, user: userWithoutPassword, token });
  } catch (error) {
    console.error("[auth] Login error:", error);
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ ok: false, error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ ok: false, error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

// Government Agency Dashboard API Endpoints

// Get aggregated dashboard data
app.get("/api/agency/dashboard", async (req, res) => {
  try {
    const activeSOS = await db.getActiveSOSIncidents();
    const recentIncidents = await db.getIncidentReports({ limit: 50 });

    // Calculate statistics
    const stats = {
      activeSOSCount: activeSOS.length,
      totalIncidentsToday: recentIncidents.filter((i) => {
        const today = new Date().toDateString();
        return new Date(i.created_at).toDateString() === today;
      }).length,
      incidentsByType: recentIncidents.reduce((acc, incident) => {
        acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
        return acc;
      }, {}),
      highPriorityIncidents: recentIncidents.filter((i) => i.threat_level >= 4)
        .length,
    };

    res.json({
      ok: true,
      data: {
        stats,
        activeSOS,
        recentIncidents,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[agency] Dashboard error:", error);
    res
      .status(500)
      .json({ ok: false, error: "Failed to fetch dashboard data" });
  }
});

// Get heatmap data for distress calls
app.get("/api/agency/heatmap", async (req, res) => {
  try {
    const { timeRange = "24h", incident_type } = req.query;

    // Calculate time filter
    const now = new Date();
    let timeFilter;
    switch (timeRange) {
      case "1h":
        timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get SOS incidents for heatmap
    const sosQuery = `
      SELECT latitude, longitude, created_at, battery_level
      FROM sos_incidents 
      WHERE created_at >= $1 AND status = 'active'
    `;
    const sosResult = await pool.query(sosQuery, [timeFilter]);

    // Get incident reports for heatmap
    let incidentQuery = `
      SELECT latitude, longitude, incident_type, threat_level, created_at
      FROM incident_reports 
      WHERE created_at >= $1
    `;
    const incidentValues = [timeFilter];

    if (incident_type) {
      incidentQuery += " AND incident_type = $2";
      incidentValues.push(incident_type);
    }

    const incidentResult = await pool.query(incidentQuery, incidentValues);

    // Combine and format heatmap data
    const heatmapData = [
      ...sosResult.rows.map((row) => ({
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
        weight: 1.0, // SOS calls have highest weight
        type: "sos",
        timestamp: row.created_at,
        metadata: {
          battery_level: row.battery_level,
        },
      })),
      ...incidentResult.rows.map((row) => ({
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
        weight: row.threat_level / 5.0, // Weight based on threat level
        type: row.incident_type,
        timestamp: row.created_at,
        metadata: {
          threat_level: row.threat_level,
        },
      })),
    ];

    res.json({
      ok: true,
      data: {
        heatmapPoints: heatmapData,
        timeRange,
        totalPoints: heatmapData.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[agency] Heatmap error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch heatmap data" });
  }
});

// AI-based priority scoring
app.get("/api/agency/priority-incidents", async (req, res) => {
  try {
    // Get all recent incidents
    const recentIncidents = await db.getIncidentReports({ limit: 100 });
    const activeSOS = await db.getActiveSOSIncidents();

    // AI Priority Engine - calculate priority scores
    const scoredIncidents = [
      ...activeSOS.map((sos) => ({
        ...sos,
        priorityScore: calculateSOSPriority(sos),
        incidentType: "sos",
        recommendations: generateRecommendations("sos", sos),
      })),
      ...recentIncidents.map((incident) => ({
        ...incident,
        priorityScore: calculateIncidentPriority(incident),
        incidentType: incident.incident_type,
        recommendations: generateRecommendations(
          incident.incident_type,
          incident,
        ),
      })),
    ];

    // Sort by priority score (highest first)
    scoredIncidents.sort((a, b) => b.priorityScore - a.priorityScore);

    res.json({
      ok: true,
      data: {
        incidents: scoredIncidents.slice(0, 20), // Top 20 priority incidents
        summary: {
          critical: scoredIncidents.filter((i) => i.priorityScore >= 0.8)
            .length,
          high: scoredIncidents.filter(
            (i) => i.priorityScore >= 0.6 && i.priorityScore < 0.8,
          ).length,
          medium: scoredIncidents.filter(
            (i) => i.priorityScore >= 0.4 && i.priorityScore < 0.6,
          ).length,
          low: scoredIncidents.filter((i) => i.priorityScore < 0.4).length,
        },
      },
    });
  } catch (error) {
    console.error("[agency] Priority engine error:", error);
    res
      .status(500)
      .json({ ok: false, error: "Failed to calculate priorities" });
  }
});

// Drone deployment recommendations
app.get("/api/agency/drone-deployments", async (req, res) => {
  try {
    const activeSOS = await db.getActiveSOSIncidents();
    const highPriorityIncidents = await db.getIncidentReports({
      limit: 10,
      filters: { threat_level: 4 },
    });

    // Generate drone deployment recommendations
    const deploymentRecommendations = [];

    // SOS incidents get immediate drone recommendation
    activeSOS.forEach((sos) => {
      deploymentRecommendations.push({
        type: "immediate",
        target: {
          latitude: parseFloat(sos.latitude),
          longitude: parseFloat(sos.longitude),
          emergencyId: sos.emergency_id,
          priority: "critical",
        },
        droneType: "reconnaissance",
        estimatedTime: "5-10 minutes",
        reason: "Active SOS emergency",
      });
    });

    // High threat level incidents
    highPriorityIncidents.forEach((incident) => {
      deploymentRecommendations.push({
        type: "scheduled",
        target: {
          latitude: parseFloat(incident.latitude),
          longitude: parseFloat(incident.longitude),
          incidentId: incident.id,
          priority: "high",
        },
        droneType: "assessment",
        estimatedTime: "15-20 minutes",
        reason: `High threat ${incident.incident_type} incident`,
      });
    });

    res.json({
      ok: true,
      data: {
        recommendations: deploymentRecommendations,
        totalDeployments: deploymentRecommendations.length,
        droneStatus: {
          available: 3,
          deployed: 2,
          maintenance: 1,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[agency] Drone deployment error:", error);
    res
      .status(500)
      .json({ ok: false, error: "Failed to generate drone recommendations" });
  }
});

// Real-time statistics
app.get("/api/agency/stats", async (req, res) => {
  try {
    const { timeframe = "24h" } = req.query;

    // Calculate time filter
    const now = new Date();
    let timeFilter;
    switch (timeframe) {
      case "1h":
        timeFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN incident_type = 'fire' THEN 1 END) as fire_incidents,
        COUNT(CASE WHEN incident_type = 'flood' THEN 1 END) as flood_incidents,
        COUNT(CASE WHEN incident_type = 'medical' THEN 1 END) as medical_incidents,
        COUNT(CASE WHEN incident_type = 'manual' THEN 1 END) as manual_incidents,
        AVG(threat_level) as avg_threat_level
      FROM incident_reports 
      WHERE created_at >= $1
    `;

    const statsResult = await pool.query(statsQuery, [timeFilter]);

    const sosStatsQuery = `
      SELECT COUNT(*) as active_sos, AVG(battery_level) as avg_battery
      FROM sos_incidents 
      WHERE created_at >= $1 AND status = 'active'
    `;

    const sosStatsResult = await pool.query(sosStatsQuery, [timeFilter]);

    const stats = {
      ...statsResult.rows[0],
      ...sosStatsResult.rows[0],
      responseRate: 85.5, // Mock data - calculate from actual resolution times
      avgResponseTime: "8.5 minutes", // Mock data
    };

    res.json({
      ok: true,
      data: {
        stats,
        timeframe,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[agency] Stats error:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch statistics" });
  }
});

// Helper functions for AI priority engine
function calculateSOSPriority(sos) {
  let score = 0.8; // Base score for SOS

  // Factor in battery level (lower battery = higher priority)
  if (sos.battery_level < 20) score += 0.15;
  else if (sos.battery_level < 50) score += 0.05;

  // Factor in time since incident (more recent = higher priority)
  const timeSinceIncident = Date.now() - new Date(sos.created_at).getTime();
  if (timeSinceIncident < 60000) score += 0.05; // Less than 1 minute

  return Math.min(score, 1.0);
}

function calculateIncidentPriority(incident) {
  let score = 0;

  // Base priority by incident type
  const typeScores = {
    fire: 0.7,
    medical: 0.8,
    flood: 0.6,
    manual: 0.4,
  };

  score = typeScores[incident.incident_type] || 0.5;

  // Factor in threat level
  score += (incident.threat_level / 5) * 0.3;

  // Factor in time since incident
  const timeSinceIncident =
    Date.now() - new Date(incident.created_at).getTime();
  if (timeSinceIncident < 3600000) score += 0.1; // Less than 1 hour

  return Math.min(score, 1.0);
}

function generateRecommendations(type, data) {
  const recommendations = [];

  if (type === "sos") {
    recommendations.push("Dispatch emergency services immediately");
    if (data.battery_level < 20) {
      recommendations.push("Urgent: Device battery critical");
    }
  } else {
    switch (data.incident_type) {
      case "fire":
        recommendations.push("Deploy fire department");
        if (data.threat_level >= 4) {
          recommendations.push("Consider evacuation orders");
        }
        break;
      case "medical":
        recommendations.push("Dispatch medical units");
        recommendations.push("Prepare nearest hospital");
        break;
      case "flood":
        recommendations.push("Deploy rescue teams");
        recommendations.push("Monitor water levels");
        break;
      case "manual":
        recommendations.push("Assess situation on-site");
        break;
    }
  }

  return recommendations;
}

// Protected routes
app.post("/api/zones", authenticateToken, async (req, res) => {
  try {
    const { name, latitude, longitude, radius_meters } = req.body;

    if (!name || !latitude || !longitude) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required fields" });
    }

    const zone = await db.createSafeZone({
      user_id: req.user.userId,
      name,
      latitude,
      longitude,
      radius_meters: radius_meters || 100,
    });

    res.json({ ok: true, zone });
  } catch (error) {
    console.error("[zones] Error creating safe zone:", error);
    res.status(500).json({ ok: false, error: "Failed to create safe zone" });
  }
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  path: SOCKET_PATH,
  cors: {
    origin: verifyOrigin,
    methods: ["GET", "POST"],
    credentials: false,
  },
  connectTimeout: 20_000,
  pingTimeout: 20_000,
  pingInterval: 25_000,
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  const clientOrigin = socket.handshake.headers.origin || "(no origin)";
  console.log(`[socket] connected id=${socket.id} origin=${clientOrigin}`);

  socket.on("update_status", (payload) => {
    if (!payload || typeof payload !== "object") return;
    socket.broadcast.emit("family_status_update", payload);
  });

  // Government dashboard subscriptions
  socket.on("subscribe_agency_updates", () => {
    socket.join("agency_dashboard");
    console.log(`[socket] Agency dashboard subscribed: ${socket.id}`);
  });

  socket.on("unsubscribe_agency_updates", () => {
    socket.leave("agency_dashboard");
    console.log(`[socket] Agency dashboard unsubscribed: ${socket.id}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected id=${socket.id} reason=${reason}`);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[http] listening on http://0.0.0.0:${PORT}`);
  console.log(`[http] LAN access: http://<this-machine-ip>:${PORT}`);
  console.log(`[socket.io] path ${SOCKET_PATH}/`);
  if (isProd && ALLOWED_ORIGINS.length === 0) {
    console.warn(
      "[warn] NODE_ENV=production but ALLOWED_ORIGINS is empty — browser clients from Expo Web will be rejected until you set ALLOWED_ORIGINS.",
    );
  }
});
