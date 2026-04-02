#!/usr/bin/env bash
# ─────────────────────────────────────────────
# IsoBolt SOC — Full Setup & Launch Script
# TelcoLearn 2026
# ─────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   ⚡  IsoBolt SOC — Setup & Build            ║"
echo "  ║      TelcoLearn Experience Platform 2026     ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Check prerequisites ──
echo -e "${BOLD}[1/4] Checking prerequisites...${NC}"

if ! command -v g++ &>/dev/null; then
    echo -e "${RED}✗ g++ not found. Install it:${NC}"
    echo "  Ubuntu/Debian: sudo apt install build-essential"
    echo "  macOS:         xcode-select --install"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} g++ found: $(g++ --version | head -1)"

if ! command -v node &>/dev/null; then
    echo -e "${RED}✗ Node.js not found. Install it from https://nodejs.org${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js found: $(node --version)"

if ! command -v npm &>/dev/null; then
    echo -e "${RED}✗ npm not found.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} npm found: $(npm --version)"

# ── Step 2: Compile C++ Simulators ──
echo ""
echo -e "${BOLD}[2/4] Compiling C++ simulation engines...${NC}"

cd "$ROOT/simulators"

echo -n "  Compiling anomaly_engine.cpp... "
g++ -std=c++17 -O2 -o anomaly_engine anomaly_engine.cpp -lpthread
echo -e "${GREEN}✓${NC}"

echo -n "  Compiling oran_transport_sim.cpp... "
g++ -std=c++17 -O2 -o oran_transport_sim oran_transport_sim.cpp -lpthread
echo -e "${GREEN}✓${NC}"

# ── Step 3: Install dependencies ──
echo ""
echo -e "${BOLD}[3/4] Installing Node.js dependencies...${NC}"

cd "$ROOT/backend"
echo "  Installing backend packages..."
npm install --silent

cd "$ROOT/frontend"
echo "  Installing frontend packages..."
npm install --silent

# ── Step 4: Build frontend ──
echo ""
echo -e "${BOLD}[4/4] Building frontend...${NC}"
npm run build

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓  Build complete!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
echo ""
echo -e "  To start the platform:"
echo -e "  ${CYAN}cd $(basename "$ROOT") && npm run start --prefix backend${NC}"
echo ""
echo -e "  Then open: ${BOLD}http://localhost:4400${NC}"
echo ""
echo -e "  For development (hot-reload frontend):"
echo -e "  Terminal 1: ${CYAN}cd backend && npm start${NC}"
echo -e "  Terminal 2: ${CYAN}cd frontend && npm run dev${NC}"
echo -e "  Then open: ${BOLD}http://localhost:3900${NC}"
echo ""
