# ─────────────────────────────────────────
# IsoBolt SOC — Production Container
# TelcoLearn 2026
# ─────────────────────────────────────────
FROM node:20-slim

# Install g++ for compiling C++ simulators
RUN apt-get update && \
    apt-get install -y --no-install-recommends g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Compile C++ engines ──
COPY simulators/ ./simulators/
RUN cd simulators && \
    g++ -std=c++17 -O2 -o anomaly_engine anomaly_engine.cpp -lpthread && \
    g++ -std=c++17 -O2 -o oran_transport_sim oran_transport_sim.cpp -lpthread && \
    echo "✓ C++ engines compiled"

# ── Install & build frontend ──
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install --silent

COPY frontend/ ./frontend/
RUN cd frontend && npm run build && echo "✓ Frontend built"

# ── Install backend ──
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --silent --production

COPY backend/ ./backend/

# ── Expose and run ──
ENV PORT=4400
ENV NODE_ENV=production
EXPOSE 4400

CMD ["node", "backend/server.js"]
