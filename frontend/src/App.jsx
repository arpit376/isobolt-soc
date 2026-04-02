import { useState, useEffect, useRef, useCallback } from "react";

/* ─── palette: muted, professional, light background ─── */
const C = {
  bg: "#f6f7f9",
  surface: "#ffffff",
  surfaceAlt: "#f0f1f4",
  border: "#e2e4ea",
  borderActive: "#3b6ec2",
  text: "#1e2330",
  textSecondary: "#4a5068",
  textMuted: "#8891a4",
  accent: "#3b6ec2",
  accentLight: "rgba(59,110,194,0.08)",
  critical: "#c93d3d",
  criticalBg: "rgba(201,61,61,0.07)",
  warning: "#b27d18",
  warningBg: "rgba(178,125,24,0.07)",
  success: "#2d8a5e",
  successBg: "rgba(45,138,94,0.07)",
  info: "#5c6ac4",
  infoBg: "rgba(92,106,196,0.07)",
};

const mono = "'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace";
const sans = "'DM Sans', 'Helvetica Neue', system-ui, sans-serif";

/* ─── WebSocket hook ─── */
function useSimData() {
  const [anomalyData, setAnomalyData] = useState(null);
  const [oranData, setOranData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("[WS] Connected to IsoBolt backend");
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "anomaly" && msg.data) {
            setAnomalyData(msg.data);
            if (msg.data.alerts?.length > 0) {
              setAlerts((prev) => [...msg.data.alerts, ...prev].slice(0, 50));
            }
          } else if (msg.type === "oran" && msg.data) {
            setOranData(msg.data);
          } else if (msg.type === "snapshot" && msg.data) {
            if (msg.data.anomaly) setAnomalyData(msg.data.anomaly);
            if (msg.data.oran) setOranData(msg.data.oran);
            if (msg.data.alerts) setAlerts(msg.data.alerts);
          }
        } catch {}
      };
      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { anomalyData, oranData, alerts, connected };
}

/* ─── small components ─── */
const SevBadge = ({ severity }) => {
  const m = {
    critical: { bg: C.criticalBg, c: C.critical, border: "rgba(201,61,61,0.2)" },
    warning: { bg: C.warningBg, c: C.warning, border: "rgba(178,125,24,0.2)" },
    info: { bg: C.infoBg, c: C.info, border: "rgba(92,106,196,0.2)" },
  };
  const s = m[severity] || m.info;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", background: s.bg, color: s.c, border: `1px solid ${s.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.c, animation: severity === "critical" ? "pulse 1.4s infinite" : "none" }} />
      {severity}
    </span>
  );
};

const Dot = ({ status }) => {
  const cm = { healthy: C.success, warning: C.warning, critical: C.critical, protected: C.success, deploying: C.accent };
  const c = cm[status] || C.textMuted;
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />;
};

const Card = ({ children, style }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, ...style }}>{children}</div>
);

const SectionHead = ({ label, sub }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{sub}</div>}
  </div>
);

const Bar = ({ value, max = 100, color, h = 4 }) => (
  <div style={{ width: "100%", height: h, borderRadius: h, background: C.surfaceAlt }}>
    <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", borderRadius: h, background: color || C.accent, transition: "width 0.5s" }} />
  </div>
);

const Gauge = ({ value }) => {
  const color = value >= 99 ? C.success : value >= 97 ? C.warning : C.critical;
  const circ = 2 * Math.PI * 26;
  const off = circ - (value / 100) * circ;
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="26" fill="none" stroke={C.surfaceAlt} strokeWidth="3.5" />
      <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 30 30)" style={{ transition: "stroke-dashoffset 0.7s" }} />
      <text x="30" y="28" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily={mono}>{value.toFixed(1)}</text>
      <text x="30" y="39" textAnchor="middle" fill={C.textMuted} fontSize="7">%</text>
    </svg>
  );
};

const Metric = ({ label, value, unit, trend, color }) => (
  <div>
    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: color || C.text, fontFamily: mono }}>{value}</span>
      {unit && <span style={{ fontSize: 10, color: C.textMuted }}>{unit}</span>}
      {trend !== undefined && (
        <span style={{ fontSize: 10, color: trend > 0 ? C.critical : C.success, marginLeft: 2 }}>
          {trend > 0 ? "↑" : "↓"}{Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

/* ─── MITRE data ─── */
const MITRE = [
  { id: "TA0001", name: "Initial Access", n: 4, c: C.critical },
  { id: "TA0002", name: "Execution", n: 3, c: C.warning },
  { id: "TA0003", name: "Persistence", n: 5, c: C.warning },
  { id: "TA0006", name: "Cred. Access", n: 2, c: C.info },
  { id: "TA0007", name: "Discovery", n: 6, c: C.accent },
  { id: "TA0008", name: "Lateral Mvmt", n: 3, c: C.critical },
  { id: "TA0040", name: "Impact", n: 4, c: C.critical },
  { id: "TA0011", name: "Command & Ctrl", n: 2, c: C.warning },
];

/* ─── fallback data (used when backend is offline) ─── */
const FALLBACK_SLICES = [
  { slice_id: "S1", name: "eMBB-Enterprise", type: "eMBB", throughput: 4.2, latency: 12.0, isolation: 99.7, status: "healthy", sessions: 134 },
  { slice_id: "S2", name: "URLLC-HFT", type: "URLLC", throughput: 1.8, latency: 0.8, isolation: 99.99, status: "healthy", sessions: 42 },
  { slice_id: "S3", name: "mMTC-IoT-Grid", type: "mMTC", throughput: 0.6, latency: 45.0, isolation: 98.2, status: "warning", sessions: 312 },
  { slice_id: "S4", name: "eMBB-Broadband", type: "eMBB", throughput: 8.1, latency: 18.0, isolation: 99.5, status: "healthy", sessions: 891 },
  { slice_id: "S5", name: "URLLC-Edge-DC", type: "URLLC", throughput: 2.4, latency: 1.2, isolation: 96.8, status: "critical", sessions: 67 },
];
const FALLBACK_ORAN = [
  { name: "O-CU-CP", load: 42, alerts: 0, status: "healthy" },
  { name: "O-CU-UP", load: 67, alerts: 1, status: "healthy" },
  { name: "O-DU", load: 78, alerts: 3, status: "warning" },
  { name: "O-RU", load: 35, alerts: 0, status: "healthy" },
  { name: "RIC-Near-RT", load: 55, alerts: 1, status: "healthy" },
  { name: "RIC-Non-RT", load: 31, alerts: 0, status: "healthy" },
  { name: "SMO", load: 48, alerts: 0, status: "healthy" },
];
const FALLBACK_ALERTS = [
  { id: "ALT-7891", time: "14:32:08", severity: "critical", source: "5G Core / AMF", title: "Unauthorized slice access attempt on URLLC-Edge-DC", mitre: "TA0001", confidence: 94.2 },
  { id: "ALT-7890", time: "14:31:45", severity: "critical", source: "O-RAN / O-DU", title: "Anomalous xApp behavior detected on Near-RT RIC", mitre: "TA0002", confidence: 92.7 },
  { id: "ALT-7889", time: "14:29:12", severity: "warning", source: "Transport / DWDM", title: "Nokia PSS-1830 optical anomaly on Pune-Mumbai link", mitre: "TA0007", confidence: 87.3 },
  { id: "ALT-7888", time: "14:27:33", severity: "warning", source: "Core / UPF", title: "GTP tunnel anomaly — mMTC-IoT-Grid slice", mitre: "TA0008", confidence: 91.0 },
  { id: "ALT-7887", time: "14:25:01", severity: "info", source: "RAN / gNB", title: "Beamforming pattern deviation at Site MH-PNE-047", mitre: "TA0007", confidence: 78.5 },
  { id: "ALT-7886", time: "14:22:18", severity: "warning", source: "SS7/Diameter", title: "Diameter signaling storm from roaming partner", mitre: "TA0040", confidence: 88.1 },
];
const FALLBACK_FIBER = [
  { name: "Mumbai Metro Ring", km: 420, utilization: 72, status: "protected" },
  { name: "Pune-Mumbai Backbone", km: 310, utilization: 58, status: "protected" },
  { name: "Maharashtra State Ring", km: 680, utilization: 45, status: "protected" },
  { name: "Gujarat Extension", km: 390, utilization: 12, status: "deploying" },
];

/* ════════════════════════════════════ MAIN APP ════════════════════════════════════ */
export default function App() {
  const { anomalyData, oranData, alerts: liveAlerts, connected } = useSimData();
  const [tab, setTab] = useState("overview");
  const [clock, setClock] = useState(new Date());
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [sliceDetail, setSliceDetail] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Resolve data: live from C++ or fallback
  const slices = anomalyData?.slices || FALLBACK_SLICES;
  const oranComps = oranData?.oran_components || FALLBACK_ORAN;
  const fiberRings = oranData?.fiber_rings || FALLBACK_FIBER;
  const xapps = oranData?.xapps || [];
  const dwdm = oranData?.dwdm || { total_channels: 80, alert_channels: 1, avg_osnr: 28.4, alert_channel_id: 34 };
  const e2 = oranData?.e2_interface || { setup_active: 124, indication_per_sec: 3200, control_per_sec: 847, unauthorized_blocked: 0 };
  const optical = oranData?.optical || { avg_osnr: 28.4, ber: 2.1e-4, chromatic_dispersion: 12.8, pmd: 0.4, fiber_tap_alert: false };
  const engineMeta = anomalyData?.engine || { ai_confidence: 96.7, total_anomalies: 2, avg_isolation: 98.4, total_throughput: 342, mean_detect_ms: 1200 };
  const displayAlerts = liveAlerts.length > 0 ? liveAlerts : FALLBACK_ALERTS;

  const tabs = [
    { id: "overview", label: "Command Center" },
    { id: "slices", label: "Slice Security" },
    { id: "oran", label: "O-RAN Monitor" },
    { id: "threats", label: "Threat Intel" },
    { id: "transport", label: "Transport Layer" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: sans, fontSize: 13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
      `}</style>

      {/* ──── Header ──── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff" }}>IB</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "0.03em" }}>ISOBOLT <span style={{ fontWeight: 500, color: C.accent }}>SOC</span></div>
              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em" }}>AI-ENHANCED TELECOM SECURITY OPERATIONS</div>
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: C.border, margin: "0 4px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 4, background: connected ? C.successBg : C.criticalBg, border: `1px solid ${connected ? "rgba(45,138,94,0.18)" : "rgba(201,61,61,0.18)"}` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? C.success : C.critical, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: connected ? C.success : C.critical }}>{connected ? "LIVE — C++ ENGINE" : "OFFLINE — STATIC"}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontSize: 10, color: C.textMuted }}>AI <span style={{ fontFamily: mono, fontWeight: 600, color: engineMeta.ai_confidence > 95 ? C.success : C.warning }}>{engineMeta.ai_confidence?.toFixed(1)}%</span></div>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: C.accent }}>{clock.toLocaleTimeString("en-IN", { hour12: false })} IST</div>
        </div>
      </div>

      {/* ──── Tabs ──── */}
      <div style={{ display: "flex", gap: 0, padding: "0 24px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedAlert(null); setSliceDetail(null); }} style={{ padding: "9px 18px", border: "none", borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent", background: "transparent", color: tab === t.id ? C.accent : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ──── Body ──── */}
      <div style={{ padding: "16px 24px 60px", maxHeight: "calc(100vh - 96px)", overflowY: "auto" }}>

        {/* ═══ COMMAND CENTER ═══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn .25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              <Card><Metric label="Active Threats" value={displayAlerts.filter(a => a.severity === "critical").length} color={C.critical} trend={12} /></Card>
              <Card><Metric label="Anomalies / tick" value={engineMeta.total_anomalies} color={C.warning} /></Card>
              <Card><Metric label="Avg Isolation" value={engineMeta.avg_isolation?.toFixed(1)} unit="%" color={C.success} /></Card>
              <Card><Metric label="Throughput" value={engineMeta.total_throughput?.toFixed(0)} unit="Gbps" color={C.accent} /></Card>
              <Card><Metric label="Detect Time" value={(engineMeta.mean_detect_ms / 1000).toFixed(1)} unit="sec" color={C.info} trend={-15} /></Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
              {/* Alert Feed */}
              <Card style={{ maxHeight: 440, display: "flex", flexDirection: "column" }}>
                <SectionHead label="Live Alert Feed" sub={`IsoBolt AI Engine — ${connected ? "streaming from C++ backend" : "static fallback"}`} />
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {displayAlerts.map((a, i) => (
                    <div key={a.id + i} onClick={() => setSelectedAlert(selectedAlert === i ? null : i)} style={{ display: "flex", gap: 10, padding: "7px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer", background: selectedAlert === i ? C.accentLight : "transparent", border: `1px solid ${selectedAlert === i ? C.borderActive + "30" : "transparent"}`, transition: "all .15s" }}>
                      <div style={{ minWidth: 48, textAlign: "center" }}>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{a.time}</div>
                        <SevBadge severity={a.severity} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{a.title}</div>
                        <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.textMuted, flexWrap: "wrap" }}>
                          <span style={{ color: C.accent }}>{a.source}</span>
                          {a.mitre && a.mitre !== "-" && <span style={{ padding: "0 4px", borderRadius: 2, background: C.infoBg, color: C.info }}>{a.mitre}</span>}
                          {a.confidence && <span style={{ fontFamily: mono }}>conf: {a.confidence.toFixed ? a.confidence.toFixed(1) : a.confidence}%</span>}
                          {a.z_score && <span style={{ fontFamily: mono }}>z: {a.z_score.toFixed ? a.z_score.toFixed(2) : a.z_score}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Right col */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card>
                  <SectionHead label="Network Slices" sub="5G Core — All Active Slices" />
                  {slices.map((s) => (
                    <div key={s.slice_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}33` }}>
                      <Dot status={s.status} />
                      <div style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{s.name}</div>
                      <span style={{ fontSize: 10, fontFamily: mono, color: C.textMuted }}>{typeof s.latency === "number" ? s.latency.toFixed(1) : s.latency}ms</span>
                      <Gauge value={typeof s.isolation === "number" ? s.isolation : parseFloat(s.isolation)} />
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionHead label="MITRE ATT&CK" sub="Telecom Detection Coverage" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                    {MITRE.map((m) => (
                      <div key={m.id} style={{ padding: "6px 4px", borderRadius: 4, background: `${m.c}08`, border: `1px solid ${m.c}18`, textAlign: "center" }}>
                        <div style={{ fontSize: 8, fontFamily: mono, color: m.c }}>{m.id}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: C.text, marginTop: 1 }}>{m.name}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: m.c, marginTop: 2 }}>{m.n}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SLICE SECURITY ═══ */}
        {tab === "slices" && (
          <div style={{ animation: "fadeIn .25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Card>
                <SectionHead label="Slice Isolation Engine" sub="AI-driven cross-slice access control" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "10px 0" }}>
                  <Metric label="Isolation Score" value={engineMeta.avg_isolation?.toFixed(1)} unit="%" color={C.success} />
                  <Metric label="Breach Attempts" value="14" color={C.critical} trend={18} />
                  <Metric label="Auto-Mitigated" value="13" color={C.success} />
                </div>
                <div style={{ padding: 10, borderRadius: 6, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.accent, marginBottom: 4 }}>POLICY ENGINE</div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary, lineHeight: 1.9 }}>
                    <div>ZTNA Policy: <span style={{ color: C.success }}>ENFORCED</span></div>
                    <div>NSSAI Validation: <span style={{ color: C.success }}>ACTIVE</span></div>
                    <div>GTP-U Inspection: <span style={{ color: C.success }}>ACTIVE</span></div>
                    <div>Cross-Slice ML: <span style={{ color: C.accent }}>v2.7.1</span> — F1: 0.981</div>
                  </div>
                </div>
              </Card>
              <Card>
                <SectionHead label="Slice Traffic" sub="Live throughput by slice" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {slices.map((s, i) => {
                    const colors = [C.accent, C.info, C.warning, C.success, C.critical];
                    return (
                      <div key={s.slice_id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Dot status={s.status} />
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontSize: 9, padding: "0px 4px", borderRadius: 2, background: `${colors[i]}12`, color: colors[i] }}>{s.type}</span>
                          </div>
                          <span style={{ fontFamily: mono, fontSize: 11, color: colors[i] }}>{typeof s.throughput === "number" ? s.throughput.toFixed(1) : s.throughput} Gbps</span>
                        </div>
                        <Bar value={typeof s.throughput === "number" ? s.throughput : parseFloat(s.throughput)} max={10} color={colors[i]} h={5} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {slices.map((s, i) => {
                const colors = [C.accent, C.info, C.warning, C.success, C.critical];
                const iso = typeof s.isolation === "number" ? s.isolation : parseFloat(s.isolation);
                return (
                  <Card key={s.slice_id} style={{ textAlign: "center", cursor: "pointer", border: `1px solid ${sliceDetail === s.slice_id ? C.borderActive + "50" : C.border}`, transition: "all .15s" }} onClick={() => setSliceDetail(sliceDetail === s.slice_id ? null : s.slice_id)}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: colors[i], marginBottom: 2 }}>{s.slice_id}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{s.name}</div>
                    <div style={{ display: "flex", justifyContent: "center" }}><Gauge value={iso} /></div>
                    <div style={{ marginTop: 6, fontSize: 10, color: C.textMuted }}>
                      <div>{typeof s.latency === "number" ? s.latency.toFixed(1) : s.latency}ms latency</div>
                      <div>{typeof s.throughput === "number" ? s.throughput.toFixed(1) : s.throughput} Gbps</div>
                      <div>{s.sessions} sessions</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ O-RAN MONITOR ═══ */}
        {tab === "oran" && (
          <div style={{ animation: "fadeIn .25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Card>
                <SectionHead label="O-RAN Components" sub="Disaggregated RAN — All Nodes" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {oranComps.map((c) => (
                    <div key={c.name} style={{ padding: 10, borderRadius: 6, background: C.surfaceAlt, border: `1px solid ${c.status === "warning" ? C.warning + "35" : c.status === "critical" ? C.critical + "35" : C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <Dot status={c.status} />
                        <span style={{ fontSize: 9, fontFamily: mono, color: c.alerts > 0 ? C.warning : C.textMuted }}>{c.alerts} alerts</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
                      <Bar value={typeof c.load === "number" ? c.load : parseFloat(c.load)} color={c.load > 80 ? C.critical : c.load > 65 ? C.warning : C.accent} h={4} />
                      <div style={{ fontSize: 10, fontFamily: mono, color: C.textMuted, textAlign: "right", marginTop: 2 }}>{typeof c.load === "number" ? c.load.toFixed(0) : c.load}%</div>
                    </div>
                  ))}
                </div>
                {/* Architecture diagram */}
                <div style={{ marginTop: 14, padding: 14, borderRadius: 6, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>O-RAN Security Topology</div>
                  <svg viewBox="0 0 600 160" style={{ width: "100%", height: 150 }}>
                    <rect x="10" y="6" width="580" height="30" rx="5" fill={C.accentLight} stroke={C.accent} strokeWidth=".8" strokeDasharray="4,2"/>
                    <text x="300" y="25" textAnchor="middle" fill={C.accent} fontSize="10" fontWeight="700">SMO — Service Management & Orchestration</text>
                    <rect x="30" y="48" width="150" height="26" rx="4" fill={C.surface} stroke={C.border} strokeWidth="1"/>
                    <text x="105" y="65" textAnchor="middle" fill={C.text} fontSize="10" fontWeight="600">Non-RT RIC</text>
                    <rect x="210" y="48" width="150" height="26" rx="4" fill={C.surface} stroke={C.border} strokeWidth="1"/>
                    <text x="285" y="65" textAnchor="middle" fill={C.text} fontSize="10" fontWeight="600">Near-RT RIC</text>
                    <rect x="400" y="45" width="180" height="32" rx="4" fill={C.accentLight} stroke={C.accent} strokeWidth="1.5"/>
                    <text x="490" y="62" textAnchor="middle" fill={C.accent} fontSize="10" fontWeight="700">IsoBolt AI Monitor</text>
                    <text x="490" y="72" textAnchor="middle" fill={C.textMuted} fontSize="7">Anomaly Detection Layer</text>
                    {[{x:50,l:"O-CU-CP"},{x:170,l:"O-CU-UP"},{x:300,l:"O-DU"},{x:420,l:"O-RU"}].map((n,i)=>(
                      <g key={i}><rect x={n.x} y="92" width={100} height="24" rx="4" fill={C.surface} stroke={n.l==="O-DU"?C.warning:C.border} strokeWidth={n.l==="O-DU"?"1.5":"1"}/><text x={n.x+50} y="108" textAnchor="middle" fill={C.text} fontSize="10">{n.l}</text></g>
                    ))}
                    {[70,200,340,460].map((x,i)=>(
                      <g key={i}><rect x={x} y="130" width={60} height="18" rx="3" fill={C.surfaceAlt} stroke={C.border} strokeWidth=".7"/><text x={x+30} y="143" textAnchor="middle" fill={C.textMuted} fontSize="7">UE Pool {i+1}</text></g>
                    ))}
                    <line x1="105" y1="74" x2="100" y2="92" stroke={C.border} strokeWidth=".8"/>
                    <line x1="285" y1="74" x2="220" y2="92" stroke={C.border} strokeWidth=".8"/>
                    <line x1="285" y1="74" x2="350" y2="92" stroke={C.border} strokeWidth=".8"/>
                  </svg>
                </div>
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card>
                  <SectionHead label="xApp Security" sub="RIC Application Integrity" />
                  {(xapps.length > 0 ? xapps : [{name:"traffic-steering-v3",status:"SUSPICIOUS"},{name:"qos-optimizer-v2",status:"VERIFIED"},{name:"load-balancer-v1",status:"VERIFIED"},{name:"slice-scheduler-v4",status:"VERIFIED"},{name:"anomaly-reporter-v1",status:"VERIFIED"}]).map((a) => (
                    <div key={a.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderRadius: 4, marginBottom: 4, background: a.status === "SUSPICIOUS" ? C.criticalBg : C.surfaceAlt, border: `1px solid ${a.status === "SUSPICIOUS" ? C.critical + "20" : C.border}` }}>
                      <span style={{ fontSize: 11, fontFamily: mono }}>{a.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: a.status === "SUSPICIOUS" ? C.critical : a.status === "UPDATING" ? C.accent : C.success }}>{a.status}</span>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionHead label="E2 Interface" sub="Control Plane Integrity" />
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.textSecondary, lineHeight: 2 }}>
                    <div>Setup Active: <span style={{ color: C.success }}>{e2.setup_active}</span></div>
                    <div>Indication: <span style={{ color: C.success }}>{e2.indication_per_sec}/sec</span></div>
                    <div>Control Req: <span style={{ color: e2.control_per_sec > 900 ? C.warning : C.success }}>{e2.control_per_sec}/sec</span></div>
                    <div>Unauthorized: <span style={{ color: e2.unauthorized_blocked > 0 ? C.critical : C.success }}>{e2.unauthorized_blocked} BLOCKED</span></div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ═══ THREAT INTEL ═══ */}
        {tab === "threats" && (
          <div style={{ animation: "fadeIn .25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Card>
                <SectionHead label="Threat Landscape" sub="IsoBolt Intelligence — Last 24h" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {[{l:"5G Core Attacks",v:14,t:22,c:C.critical},{l:"O-RAN Exploits",v:3,t:-10,c:C.warning},{l:"SS7/Diameter",v:8,t:45,c:C.critical},{l:"Slice Violations",v:6,t:12,c:C.warning},{l:"GTP Anomalies",v:11,t:-5,c:C.info},{l:"Supply Chain",v:2,t:100,c:C.critical}].map(t=>(
                    <div key={t.l} style={{ padding: 8, borderRadius: 5, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                      <Metric label={t.l} value={t.v} color={t.c} trend={t.t} />
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionHead label="MITRE ATT&CK for Telecom" sub="Detection coverage" />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {MITRE.map(m=>(
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, fontFamily: mono, color: m.c, width: 50 }}>{m.id}</span>
                      <span style={{ fontSize: 10, width: 100, fontWeight: 600 }}>{m.name}</span>
                      <div style={{ flex: 1 }}><Bar value={m.n} max={8} color={m.c} h={7} /></div>
                      <span style={{ fontSize: 11, fontFamily: mono, color: m.c, width: 16, textAlign: "right" }}>{m.n}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card>
              <SectionHead label="Active Threat Vectors" sub="Mapped to Microscan infrastructure" />
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Vector","Target","MITRE","Severity","Status","Mitigation"].map(h=>(
                      <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {v:"Rogue xApp Injection",t:"Near-RT RIC",m:"TA0002",s:"critical",st:"Investigating",mt:"E2 interface quarantined"},
                    {v:"Cross-Slice Lateral Move",t:"URLLC-Edge-DC (S5)",m:"TA0008",s:"critical",st:"Active",mt:"ZTNA enforcement in progress"},
                    {v:"Diameter Signaling Flood",t:"HSS/UDM",m:"TA0040",s:"warning",st:"Mitigating",mt:"Rate limiting at 2k msg/sec"},
                    {v:"GTP-U Tunnel Injection",t:"mMTC-IoT UPF",m:"TA0008",s:"warning",st:"Mitigated",mt:"Tunnel rebuilt"},
                    {v:"OSNR Manipulation",t:"Pune-Mumbai λ-34",m:"TA0007",s:"warning",st:"Monitoring",mt:"Ciena WaveLogic cross-check"},
                    {v:"Beamforming Deviation",t:"gNB MH-PNE-047",m:"TA0007",s:"info",st:"Resolved",mt:"Environmental cause"},
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}33` }}>
                      <td style={{ padding: "7px 8px", fontWeight: 600 }}>{r.v}</td>
                      <td style={{ padding: "7px 8px", fontFamily: mono, color: C.accent, fontSize: 10 }}>{r.t}</td>
                      <td style={{ padding: "7px 8px" }}><span style={{ padding: "0 4px", borderRadius: 2, background: C.infoBg, color: C.info, fontSize: 10 }}>{r.m}</span></td>
                      <td style={{ padding: "7px 8px" }}><SevBadge severity={r.s} /></td>
                      <td style={{ padding: "7px 8px", fontSize: 10, color: r.st==="Mitigated"||r.st==="Resolved"?C.success:C.warning }}>{r.st}</td>
                      <td style={{ padding: "7px 8px", fontSize: 10, color: C.textMuted }}>{r.mt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ═══ TRANSPORT LAYER ═══ */}
        {tab === "transport" && (
          <div style={{ animation: "fadeIn .25s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Card>
                <SectionHead label="Fiber Ring Protection" sub="Microscan — 1,800+ km Network" />
                {fiberRings.map(r=>(
                  <div key={r.name} style={{ padding: 10, borderRadius: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Dot status={r.status} /><span style={{ fontSize: 11, fontWeight: 600 }}>{r.name}</span></div>
                      <span style={{ fontSize: 10, color: C.textMuted }}>{r.km} km</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1 }}><Bar value={typeof r.utilization === "number" ? r.utilization : parseFloat(r.utilization)} color={r.utilization > 70 ? C.warning : C.accent} h={5} /></div>
                      <span style={{ fontFamily: mono, fontSize: 10 }}>{typeof r.utilization === "number" ? r.utilization.toFixed(0) : r.utilization}%</span>
                    </div>
                  </div>
                ))}
              </Card>
              <Card>
                <SectionHead label="Optical Layer Security" sub="Nokia PSE + Ciena WaveLogic 5e" />
                {[
                  {p:"OSNR (Avg)",v:`${optical.avg_osnr?.toFixed(1)} dB`,ok:true,n:"C-band average"},
                  {p:"BER (Pre-FEC)",v:typeof optical.ber==="number"?optical.ber.toExponential(1):"2.1e-4",ok:true,n:"Within Nokia PSE-Vs threshold"},
                  {p:"Chromatic Disp.",v:`${optical.chromatic_dispersion?.toFixed(1)} ps/nm`,ok:true,n:"Ciena coherent DSP compensated"},
                  {p:"PMD",v:`${optical.pmd?.toFixed(2)} ps`,ok:true,n:"Within 400G tolerance"},
                  {p:"Fiber Tap Detect",v:optical.fiber_tap_alert?"1 ALERT":"CLEAR",ok:!optical.fiber_tap_alert,n:optical.fiber_tap_alert?"Pune-Mumbai span — monitoring":"All clear"},
                ].map(i=>(
                  <div key={i.p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 4, background: C.surfaceAlt, border: `1px solid ${!i.ok ? C.warning+"28":C.border}`, marginBottom: 6 }}>
                    <Dot status={i.ok?"healthy":"warning"} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{i.p}</span>
                        <span style={{ fontFamily: mono, fontSize: 11, color: i.ok ? C.accent : C.warning }}>{i.v}</span>
                      </div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{i.n}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
            <Card>
              <SectionHead label="DWDM Channel Map" sub={`${dwdm.total_channels} Channels — C-Band — Nokia 1830 PSS`} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                {Array.from({length:80},(_,i)=>{
                  const isAlert = (i+1) === dwdm.alert_channel_id;
                  const shade = isAlert ? C.critical : (Math.random() > 0.7 ? C.warning : (Math.random() > 0.4 ? C.accent : C.success));
                  return <div key={i} title={`λ-${i+1}${isAlert?" — ALERT":""}`} style={{width:22,height:22,borderRadius:3,background:`${shade}12`,border:`1px solid ${shade}${isAlert?"55":"22"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontFamily:mono,color:shade,animation:isAlert?"pulse 1.4s infinite":"none"}}>{i+1}</div>;
                })}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 9, color: C.textMuted }}>
                {[{l:"Normal",c:C.success},{l:"Elevated",c:C.warning},{l:"Alert",c:C.critical}].map(x=>(
                  <span key={x.l}><span style={{display:"inline-block",width:7,height:7,borderRadius:2,background:x.c,marginRight:3,verticalAlign:"middle"}}/>{x.l}</span>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ──── Footer / Branding ──── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 24px", background: C.surface, borderTop: `1px solid ${C.border}`, zIndex: 100 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.06em" }}>
          <span style={{ color: C.accent }}>TelcoLearn</span> 2026 — Experience Platform
        </div>
        <div style={{ fontSize: 9, color: C.textMuted }}>
          IsoBolt SOC v2.7.1 · Microscan Infocommtech Integration
        </div>
      </div>
    </div>
  );
}
