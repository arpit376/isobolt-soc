# IsoBolt SOC — AI-Enhanced Security Operations Center for Telecom Networks

**TelcoLearn Experience Platform 2026** · Proof of Concept for Microscan Infocommtech

---

## Overview

IsoBolt SOC is a telecom-native Security Operations Center (SOC) platform that uses AI-driven anomaly detection to monitor 5G network slices, O-RAN components, and optical transport infrastructure in real time.

This POC demonstrates the integration architecture proposed for Microscan Infocommtech's existing NOC/SOC infrastructure (MCIC), featuring:

- **C++ Simulation Engines** — Two compiled binaries that simulate real-time network telemetry, anomaly detection (using Exponential Moving Average with z-score thresholding), and O-RAN/transport layer data
- **Node.js Backend** — Spawns and manages C++ processes, streams data to the browser via WebSocket
- **React Frontend** — Five-tab SOC dashboard with live data visualization

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — http://localhost:4400                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React Frontend (IsoBolt SOC Dashboard)                │  │
│  │  Command Center │ Slice Security │ O-RAN │ Threats │ T │  │
│  └───────────────────────────┬────────────────────────────┘  │
│                              │ WebSocket (ws://localhost:4400/ws)
├──────────────────────────────┼───────────────────────────────┤
│  Node.js Backend (Express)   │                               │
│  ┌───────────────────────────┴────────────────────────────┐  │
│  │  WebSocket Server          REST API (/api/*)           │  │
│  │       │                         │                      │  │
│  │  ┌────┴─────┐            ┌──────┴──────┐               │  │
│  │  │ stdout   │            │ Alert       │               │  │
│  │  │ parser   │            │ History     │               │  │
│  │  └────┬─────┘            └─────────────┘               │  │
│  └───────┼────────────────────────────────────────────────┘  │
│          │ spawn + pipe stdout                               │
├──────────┼───────────────────────────────────────────────────┤
│  C++ Simulation Engines (compiled binaries)                  │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │  anomaly_engine   │  │  oran_transport_sim              │  │
│  │                   │  │                                  │  │
│  │  • EMA Detector   │  │  • O-RAN component health       │  │
│  │  • Slice metrics  │  │  • Fiber ring monitoring         │  │
│  │  • Z-score alerts │  │  • xApp integrity checks        │  │
│  │  • 5G telemetry   │  │  • DWDM channel simulation      │  │
│  │                   │  │  • E2 interface metrics          │  │
│  │  JSON stdout      │  │  • Optical parameters            │  │
│  │  every 2s         │  │  JSON stdout every 2.5s          │  │
│  └──────────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool    | Version  | Check command      |
|---------|----------|--------------------|
| g++     | C++17+   | `g++ --version`    |
| Node.js | 18+      | `node --version`   |
| npm     | 9+       | `npm --version`    |

---

## Quick Start

```bash
# 1. Clone or extract the project
cd isobolt-soc

# 2. Run the setup script (compiles C++, installs deps, builds frontend)
chmod +x setup.sh
./setup.sh

# 3. Start the platform
cd backend && npm start

# 4. Open in browser
#    → http://localhost:4400
```

---

## Manual Setup (step by step)

### Compile C++ Engines

```bash
cd simulators

# Anomaly detection engine
g++ -std=c++17 -O2 -o anomaly_engine anomaly_engine.cpp -lpthread

# O-RAN & transport simulator
g++ -std=c++17 -O2 -o oran_transport_sim oran_transport_sim.cpp -lpthread

# Test them
./anomaly_engine --once     # prints one JSON tick
./oran_transport_sim --once # prints one JSON tick
```

### Install and Build Frontend

```bash
cd frontend
npm install
npm run build
```

### Install and Start Backend

```bash
cd backend
npm install
npm start
```

---

## Development Mode (hot reload)

```bash
# Terminal 1 — Backend + C++ engines
cd backend && npm start

# Terminal 2 — Frontend dev server with proxy
cd frontend && npm run dev

# Open http://localhost:3900 (proxies API/WS to :4400)
```

---

## C++ Engines — Technical Details

### anomaly_engine

**Algorithm:** Exponential Moving Average (EMA) with z-score anomaly detection.

- Maintains running EMA and variance for 5 telemetry sources
- Computes z-score for each new datapoint
- Triggers alerts when z > 2.5 (info), z > 3.0 (warning), z > 4.0 (critical)
- Injects synthetic anomalies with ~8% probability per tick
- Monitors 5 network slices with throughput, latency, and isolation scoring

**Flags:**
- `--once` — Print a single JSON tick and exit
- `--interval <ms>` — Set tick interval (default: 2000ms)

### oran_transport_sim

Simulates the O-RAN disaggregated architecture and optical transport layer:

- 7 O-RAN components with load and alert simulation
- 4 fiber rings matching Microscan's real topology
- 5 xApps with integrity status (random SUSPICIOUS injection)
- 80 DWDM channels with periodic alert on λ-34
- E2 interface metrics (setup, indication, control, unauthorized)
- Optical parameters (OSNR, BER, CD, PMD, fiber tap detection)

**Flags:** Same as anomaly_engine

---

## Dashboard Tabs

| Tab             | Data Source      | Features                                                    |
|-----------------|------------------|-------------------------------------------------------------|
| Command Center  | anomaly_engine   | KPIs, live alert feed, slice overview, MITRE ATT&CK tiles  |
| Slice Security  | anomaly_engine   | Isolation gauges, policy engine, per-slice drill-down       |
| O-RAN Monitor   | oran_transport   | Component health, topology diagram, xApp integrity, E2 mon |
| Threat Intel    | Both             | Threat landscape, MITRE coverage bars, threat vector table  |
| Transport Layer | oran_transport   | Fiber rings, optical params, 80-channel DWDM security map  |

---

## API Endpoints

| Endpoint          | Method | Description                          |
|-------------------|--------|--------------------------------------|
| `/api/status`     | GET    | Engine status and uptime             |
| `/api/alerts`     | GET    | Last 50 alerts                       |
| `/api/snapshot`   | GET    | Latest state from both simulators    |
| `/ws`             | WS     | Live stream (anomaly + oran events)  |

---

## Offline Mode

If the C++ engines are not compiled or the backend is not running, the frontend falls back to static demonstration data. The header shows `OFFLINE — STATIC` instead of `LIVE — C++ ENGINE`. This means the dashboard can be shown even without the backend for a quick demo.

---

## Project Structure

```
isobolt-soc/
├── setup.sh                  # One-command build script
├── README.md
├── simulators/
│   ├── anomaly_engine.cpp    # C++ anomaly detection engine
│   └── oran_transport_sim.cpp # C++ O-RAN & transport simulator
├── backend/
│   ├── package.json
│   └── server.js             # Express + WebSocket + process manager
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        └── App.jsx           # IsoBolt SOC Dashboard
```

---

**TelcoLearn 2026** · www.TelcoLearn.com · info@TelcoLearn.com
