// IsoBolt SOC Backend Server
// TelcoLearn 2026
// Spawns C++ simulation engines and streams data via WebSocket

const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const cors = require("cors");
const path = require("path");
const http = require("http");
const fs = require("fs");

const PORT = process.env.PORT || 4400;
const SIM_DIR = path.join(__dirname, "..", "simulators");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend build
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(frontendDist, "index.html"));
    }
  });
}

// Alert history buffer
let alertHistory = [];
const MAX_ALERTS = 100;

// Latest state from each simulator
let latestAnomalyData = null;
let latestOranData = null;

// REST endpoints for initial data load
app.get("/api/status", (req, res) => {
  res.json({
    status: "online",
    engine: "IsoBolt v2.7.1",
    simulators: {
      anomaly_engine: !!anomalyProcess,
      oran_transport: !!oranProcess,
    },
    alert_count: alertHistory.length,
    uptime: process.uptime(),
  });
});

app.get("/api/alerts", (req, res) => {
  res.json(alertHistory.slice(-50));
});

app.get("/api/snapshot", (req, res) => {
  res.json({
    anomaly: latestAnomalyData,
    oran: latestOranData,
    alerts: alertHistory.slice(-20),
  });
});

const server = http.createServer(app);

// WebSocket server on the same port
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  // Send latest snapshot immediately
  ws.send(
    JSON.stringify({
      type: "snapshot",
      data: {
        anomaly: latestAnomalyData,
        oran: latestOranData,
        alerts: alertHistory.slice(-20),
      },
      ts: Date.now(),
    })
  );
  ws.on("close", () => console.log("[WS] Client disconnected"));
});

// Spawn and manage C++ simulator processes
let anomalyProcess = null;
let oranProcess = null;

function spawnSimulator(name, binary, args = []) {
  const binPath = path.join(SIM_DIR, binary);
  if (!fs.existsSync(binPath)) {
    console.error(`[SIM] Binary not found: ${binPath}`);
    console.error(`[SIM] Compile it first: cd simulators && g++ -std=c++17 -O2 -o ${binary} ${binary.replace(/_sim$/, '_sim')}.cpp -lpthread`);
    return null;
  }

  console.log(`[SIM] Spawning ${name}: ${binPath}`);
  const proc = spawn(binPath, args);

  let buffer = "";
  proc.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (name === "anomaly_engine") {
          latestAnomalyData = data;
          // Accumulate alerts
          if (data.alerts && data.alerts.length > 0) {
            alertHistory.push(...data.alerts);
            if (alertHistory.length > MAX_ALERTS)
              alertHistory = alertHistory.slice(-MAX_ALERTS);
          }
          broadcast("anomaly", data);
        } else if (name === "oran_transport") {
          latestOranData = data;
          broadcast("oran", data);
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  });

  proc.stderr.on("data", (d) =>
    console.error(`[SIM:${name}] ${d.toString().trim()}`)
  );
  proc.on("exit", (code) => {
    console.log(`[SIM] ${name} exited with code ${code}`);
    // Auto-restart after 3 seconds
    setTimeout(() => {
      console.log(`[SIM] Restarting ${name}...`);
      if (name === "anomaly_engine")
        anomalyProcess = spawnSimulator(name, binary, args);
      else oranProcess = spawnSimulator(name, binary, args);
    }, 3000);
  });

  return proc;
}

// Start the server
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║    ⚡  IsoBolt SOC — Backend Server              ║
  ║       TelcoLearn Experience Platform 2026        ║
  ║                                                  ║
  ║    HTTP + WS : http://localhost:${PORT}             ║
  ║    WebSocket : ws://localhost:${PORT}/ws             ║
  ║    API       : http://localhost:${PORT}/api/status   ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
  `);

  // Launch simulators
  anomalyProcess = spawnSimulator("anomaly_engine", "anomaly_engine", [
    "--interval",
    "2000",
  ]);
  oranProcess = spawnSimulator("oran_transport", "oran_transport_sim", [
    "--interval",
    "2500",
  ]);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[SRV] Shutting down...");
  if (anomalyProcess) anomalyProcess.kill();
  if (oranProcess) oranProcess.kill();
  server.close();
  process.exit(0);
});
