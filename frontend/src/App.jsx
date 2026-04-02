import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  navy: "#0b1a3e", navyLight: "#132347", navyMid: "#1a2f5a",
  teal: "#0ab4b8", tealDark: "#089396", tealLight: "rgba(10,180,184,0.08)", tealBorder: "rgba(10,180,184,0.18)",
  gold: "#e8a317", goldBg: "rgba(232,163,23,0.08)",
  bg: "#f4f6fa", white: "#ffffff", card: "#ffffff",
  border: "#e4e7ee", borderLight: "#edf0f5",
  text: "#1a1f36", textMid: "#4e5468", textMuted: "#8892a8",
  red: "#d14343", redBg: "rgba(209,67,67,0.07)", redBorder: "rgba(209,67,67,0.16)",
  green: "#1a9a5a", greenBg: "rgba(26,154,90,0.07)",
  indigo: "#5c6bc0", indigoBg: "rgba(92,107,192,0.07)",
};
const mono = "'SF Mono','Cascadia Code','Fira Code',Consolas,monospace";
const sans = "'Inter','Segoe UI',system-ui,sans-serif";

function useSimData() {
  const [anomalyData, setAnomalyData] = useState(null);
  const [oranData, setOranData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const rcTimer = useRef(null);
  const connect = useCallback(() => {
    try {
      const p = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${p}//${window.location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.type === "anomaly" && m.data) { setAnomalyData(m.data); if (m.data.alerts?.length) setAlerts(prev => [...m.data.alerts, ...prev].slice(0, 50)); }
          else if (m.type === "oran" && m.data) setOranData(m.data);
          else if (m.type === "snapshot" && m.data) { if (m.data.anomaly) setAnomalyData(m.data.anomaly); if (m.data.oran) setOranData(m.data.oran); if (m.data.alerts) setAlerts(m.data.alerts); }
        } catch {}
      };
      ws.onclose = () => { setConnected(false); rcTimer.current = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    } catch { setConnected(false); }
  }, []);
  useEffect(() => { connect(); return () => { wsRef.current?.close(); clearTimeout(rcTimer.current); }; }, [connect]);
  return { anomalyData, oranData, alerts, connected };
}

const SevBadge = ({ s }) => {
  const m = { critical: { bg: C.redBg, c: C.red, b: C.redBorder }, warning: { bg: C.goldBg, c: C.gold, b: "rgba(232,163,23,0.18)" }, info: { bg: C.indigoBg, c: C.indigo, b: "rgba(92,107,192,0.16)" } };
  const x = m[s] || m.info;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", background: x.bg, color: x.c, border: `1px solid ${x.b}` }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: x.c, animation: s === "critical" ? "pulse 1.4s infinite" : "none" }} />{s}
  </span>;
};
const Dot = ({ st }) => { const cm = { healthy: C.green, warning: C.gold, critical: C.red, protected: C.green, deploying: C.teal }; return <span style={{ width: 7, height: 7, borderRadius: "50%", background: cm[st] || C.textMuted, flexShrink: 0, display: "inline-block" }} />; };
const Card = ({ children, style, accent }) => <div style={{ background: C.card, border: `1px solid ${accent ? C.tealBorder : C.border}`, borderRadius: 10, padding: 18, boxShadow: "0 1px 4px rgba(11,26,62,0.04)", ...style }}>{children}</div>;
const Head = ({ label, sub }) => <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: ".07em", textTransform: "uppercase" }}>{label}</div>{sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{sub}</div>}</div>;
const Bar = ({ v, max = 100, color, h = 4 }) => <div style={{ width: "100%", height: h, borderRadius: h, background: C.borderLight }}><div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", borderRadius: h, background: color || C.teal, transition: "width .5s" }} /></div>;
const Val = ({ label, value, unit, trend, color }) => <div><div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{label}</div><div style={{ display: "flex", alignItems: "baseline", gap: 3 }}><span style={{ fontSize: 22, fontWeight: 700, color: color || C.text, fontFamily: mono }}>{value}</span>{unit && <span style={{ fontSize: 10, color: C.textMuted }}>{unit}</span>}{trend !== undefined && <span style={{ fontSize: 10, color: trend > 0 ? C.red : C.green, marginLeft: 3 }}>{trend > 0 ? "↑" : "↓"}{Math.abs(trend)}%</span>}</div></div>;
const Gauge = ({ value }) => { const c = value >= 99 ? C.green : value >= 97 ? C.gold : C.red; const r = 24, circ = 2 * Math.PI * r; return <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r={r} fill="none" stroke={C.borderLight} strokeWidth="3.5" /><circle cx="28" cy="28" r={r} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (value / 100) * circ} transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset .7s" }} /><text x="28" y="26" textAnchor="middle" fill={c} fontSize="10" fontWeight="700" fontFamily={mono}>{value.toFixed(1)}</text><text x="28" y="37" textAnchor="middle" fill={C.textMuted} fontSize="7">%</text></svg>; };

const MITRE = [
  { id: "TA0001", name: "Initial Access", n: 4, c: C.red }, { id: "TA0002", name: "Execution", n: 3, c: C.gold },
  { id: "TA0003", name: "Persistence", n: 5, c: C.gold }, { id: "TA0006", name: "Cred. Access", n: 2, c: C.indigo },
  { id: "TA0007", name: "Discovery", n: 6, c: C.tealDark }, { id: "TA0008", name: "Lateral Mvmt", n: 3, c: C.red },
  { id: "TA0040", name: "Impact", n: 4, c: C.red }, { id: "TA0011", name: "Cmd & Control", n: 2, c: C.gold },
];
const FB_S = [
  { slice_id: "S1", name: "eMBB-Enterprise", type: "eMBB", throughput: 4.2, latency: 12, isolation: 99.7, status: "healthy", sessions: 134 },
  { slice_id: "S2", name: "URLLC-HFT", type: "URLLC", throughput: 1.8, latency: 0.8, isolation: 99.99, status: "healthy", sessions: 42 },
  { slice_id: "S3", name: "mMTC-IoT-Grid", type: "mMTC", throughput: 0.6, latency: 45, isolation: 98.2, status: "warning", sessions: 312 },
  { slice_id: "S4", name: "eMBB-Broadband", type: "eMBB", throughput: 8.1, latency: 18, isolation: 99.5, status: "healthy", sessions: 891 },
  { slice_id: "S5", name: "URLLC-Edge-DC", type: "URLLC", throughput: 2.4, latency: 1.2, isolation: 96.8, status: "critical", sessions: 67 },
];
const FB_O = [
  { name: "O-CU-CP", load: 42, alerts: 0, status: "healthy" }, { name: "O-CU-UP", load: 67, alerts: 1, status: "healthy" },
  { name: "O-DU", load: 78, alerts: 3, status: "warning" }, { name: "O-RU", load: 35, alerts: 0, status: "healthy" },
  { name: "RIC-Near-RT", load: 55, alerts: 1, status: "healthy" }, { name: "RIC-Non-RT", load: 31, alerts: 0, status: "healthy" },
  { name: "SMO", load: 48, alerts: 0, status: "healthy" },
];
const FB_A = [
  { id: "ALT-7891", time: "14:32:08", severity: "critical", source: "5G Core / AMF", title: "Unauthorized slice access attempt on URLLC-Edge-DC", mitre: "TA0001", confidence: 94.2 },
  { id: "ALT-7890", time: "14:31:45", severity: "critical", source: "O-RAN / O-DU", title: "Anomalous xApp behavior detected on Near-RT RIC", mitre: "TA0002", confidence: 92.7 },
  { id: "ALT-7889", time: "14:29:12", severity: "warning", source: "Transport / DWDM", title: "Nokia PSS-1830 optical anomaly on Pune-Mumbai link", mitre: "TA0007", confidence: 87.3 },
  { id: "ALT-7888", time: "14:27:33", severity: "warning", source: "Core / UPF", title: "GTP tunnel anomaly — mMTC-IoT-Grid slice", mitre: "TA0008", confidence: 91.0 },
  { id: "ALT-7887", time: "14:25:01", severity: "info", source: "RAN / gNB", title: "Beamforming pattern deviation at Site MH-PNE-047", mitre: "TA0007", confidence: 78.5 },
  { id: "ALT-7886", time: "14:22:18", severity: "warning", source: "SS7/Diameter", title: "Diameter signaling storm from roaming partner", mitre: "TA0040", confidence: 88.1 },
];
const FB_F = [
  { name: "Mumbai Metro Ring", km: 420, utilization: 72, status: "protected" }, { name: "Pune-Mumbai Backbone", km: 310, utilization: 58, status: "protected" },
  { name: "Maharashtra State Ring", km: 680, utilization: 45, status: "protected" }, { name: "Gujarat Extension", km: 390, utilization: 12, status: "deploying" },
];

export default function App() {
  const { anomalyData, oranData, alerts: live, connected } = useSimData();
  const [tab, setTab] = useState("overview");
  const [clock, setClock] = useState(new Date());
  const [selAlert, setSelAlert] = useState(null);
  const [selSlice, setSelSlice] = useState(null);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  const slices = anomalyData?.slices || FB_S;
  const oranComps = oranData?.oran_components || FB_O;
  const fiberRings = oranData?.fiber_rings || FB_F;
  const xapps = oranData?.xapps || [{ name: "traffic-steering-v3", status: "SUSPICIOUS" }, { name: "qos-optimizer-v2", status: "VERIFIED" }, { name: "load-balancer-v1", status: "VERIFIED" }, { name: "slice-scheduler-v4", status: "VERIFIED" }, { name: "anomaly-reporter-v1", status: "VERIFIED" }];
  const dwdm = oranData?.dwdm || { total_channels: 80, alert_channel_id: 34, avg_osnr: 28.4 };
  const e2 = oranData?.e2_interface || { setup_active: 124, indication_per_sec: 3200, control_per_sec: 847, unauthorized_blocked: 0 };
  const optical = oranData?.optical || { avg_osnr: 28.4, ber: 2.1e-4, chromatic_dispersion: 12.8, pmd: 0.4, fiber_tap_alert: false };
  const eng = anomalyData?.engine || { ai_confidence: 96.7, total_anomalies: 2, avg_isolation: 98.4, total_throughput: 342, mean_detect_ms: 1200 };
  const alerts = live.length > 0 ? live : FB_A;
  const n = (v, d = 1) => typeof v === "number" ? v.toFixed(d) : v;

  const tabs = [{ id: "overview", label: "Command Center" }, { id: "slices", label: "Slice Security" }, { id: "oran", label: "O-RAN Monitor" }, { id: "threats", label: "Threat Intel" }, { id: "transport", label: "Transport Layer" }];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: sans, fontSize: 13 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}button:hover{filter:brightness(1.08)}`}</style>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, padding: "0 28px", borderBottom: `2px solid ${C.teal}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/isobolt-logo.png" alt="IsoBolt" style={{ height: 34, objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} />
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.12)" }} />
            <div><div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: ".02em" }}>Security Operations Center</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: ".1em", textTransform: "uppercase" }}>AI-Enhanced Telecom Network Protection</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 12px", borderRadius: 5, background: connected ? "rgba(26,154,90,0.15)" : "rgba(209,67,67,0.15)", border: `1px solid ${connected ? "rgba(26,154,90,0.3)" : "rgba(209,67,67,0.3)"}` }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? C.green : C.red, animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: connected ? "#5ee8a0" : "#ff8a8a" }}>{connected ? "LIVE — C++ ENGINE" : "OFFLINE — DEMO"}</span>
            </div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>AI ENGINE</div><div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: C.teal }}>{n(eng.ai_confidence)}%</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>IST</div><div style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: "#fff" }}>{clock.toLocaleTimeString("en-IN", { hour12: false })}</div></div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 0, padding: "0 28px", background: C.white, borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setSelAlert(null); setSelSlice(null); }} style={{ padding: "11px 20px", border: "none", borderBottom: tab === t.id ? `2px solid ${C.teal}` : "2px solid transparent", background: "transparent", color: tab === t.id ? C.navy : C.textMuted, fontSize: 12, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", letterSpacing: ".01em" }}>{t.label}</button>)}
      </div>

      {/* BODY */}
      <div style={{ padding: "18px 28px 70px", maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>

        {tab === "overview" && <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
            {[{ l: "Active Threats", v: alerts.filter(a => a.severity === "critical").length, c: C.red, t: 12 }, { l: "Anomalies / tick", v: eng.total_anomalies, c: C.gold }, { l: "Avg Isolation", v: n(eng.avg_isolation), u: "%", c: C.green }, { l: "Throughput", v: n(eng.total_throughput, 0), u: "Gbps", c: C.teal }, { l: "Detect Time", v: n(eng.mean_detect_ms / 1000), u: "sec", c: C.indigo, t: -15 }].map((m, i) => <Card key={i}><Val label={m.l} value={m.v} unit={m.u} color={m.c} trend={m.t} /></Card>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr", gap: 14 }}>
            <Card style={{ maxHeight: 460, display: "flex", flexDirection: "column" }}>
              <Head label="Live Alert Feed" sub={`IsoBolt AI v2.7.1 — ${connected ? "streaming from C++ engine" : "demonstration data"}`} />
              <div style={{ flex: 1, overflowY: "auto" }}>
                {alerts.map((a, i) => <div key={a.id + i} onClick={() => setSelAlert(selAlert === i ? null : i)} style={{ display: "flex", gap: 12, padding: "8px 10px", borderRadius: 7, marginBottom: 3, cursor: "pointer", background: selAlert === i ? C.tealLight : "transparent", border: `1px solid ${selAlert === i ? C.tealBorder : "transparent"}`, transition: "all .15s" }}>
                  <div style={{ minWidth: 52, textAlign: "center" }}><div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{a.time}</div><SevBadge s={a.severity} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 3 }}>{a.title}</div><div style={{ display: "flex", gap: 8, fontSize: 10, color: C.textMuted, flexWrap: "wrap" }}><span style={{ color: C.tealDark, fontWeight: 500 }}>{a.source}</span>{a.mitre && a.mitre !== "-" && <span style={{ padding: "0 5px", borderRadius: 3, background: C.indigoBg, color: C.indigo, fontWeight: 500 }}>{a.mitre}</span>}{a.confidence && <span style={{ fontFamily: mono }}>conf: {typeof a.confidence === "number" ? a.confidence.toFixed(1) : a.confidence}%</span>}{a.z_score && <span style={{ fontFamily: mono }}>z: {typeof a.z_score === "number" ? a.z_score.toFixed(2) : a.z_score}</span>}</div></div>
                </div>)}
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card><Head label="Network Slices" sub="5G Core — Active Slices" />{slices.map(s => <div key={s.slice_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.borderLight}` }}><Dot st={s.status} /><div style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{s.name}</div><span style={{ fontSize: 10, fontFamily: mono, color: C.textMuted }}>{n(s.latency)}ms</span><Gauge value={typeof s.isolation === "number" ? s.isolation : parseFloat(s.isolation)} /></div>)}</Card>
              <Card><Head label="MITRE ATT&CK" sub="Telecom Detection Coverage" /><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>{MITRE.map(m => <div key={m.id} style={{ padding: "7px 4px", borderRadius: 6, background: `${m.c}08`, border: `1px solid ${m.c}14`, textAlign: "center" }}><div style={{ fontSize: 8, fontFamily: mono, color: m.c }}>{m.id}</div><div style={{ fontSize: 9, fontWeight: 600, color: C.text, marginTop: 1 }}>{m.name}</div><div style={{ fontSize: 16, fontWeight: 800, color: m.c, marginTop: 2 }}>{m.n}</div></div>)}</div></Card>
            </div>
          </div>
        </div>}

        {tab === "slices" && <div style={{ animation: "fadeUp .3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Card accent><Head label="Slice Isolation Engine" sub="AI-driven cross-slice access control" /><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, margin: "12px 0" }}><Val label="Isolation Score" value={n(eng.avg_isolation)} unit="%" color={C.green} /><Val label="Breach Attempts" value="14" color={C.red} trend={18} /><Val label="Auto-Mitigated" value="13" color={C.green} /></div><div style={{ padding: 12, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}><div style={{ fontSize: 10, fontWeight: 700, color: C.tealDark, marginBottom: 5, letterSpacing: ".05em" }}>POLICY ENGINE</div><div style={{ fontFamily: mono, fontSize: 10, color: C.textMid, lineHeight: 2 }}><div>ZTNA Policy: <span style={{ color: C.green, fontWeight: 600 }}>ENFORCED</span></div><div>NSSAI Validation: <span style={{ color: C.green, fontWeight: 600 }}>ACTIVE</span></div><div>GTP-U Inspection: <span style={{ color: C.green, fontWeight: 600 }}>ACTIVE</span></div><div>Cross-Slice ML: <span style={{ color: C.teal, fontWeight: 600 }}>v2.7.1</span> — F1: 0.981</div></div></div></Card>
            <Card><Head label="Slice Traffic" sub="Live throughput by slice" /><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{slices.map((s, i) => { const cls = [C.teal, C.indigo, C.gold, C.green, C.red]; return <div key={s.slice_id}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><Dot st={s.status} /><span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span><span style={{ fontSize: 9, padding: "0 5px", borderRadius: 3, background: `${cls[i]}10`, color: cls[i], fontWeight: 500 }}>{s.type}</span></div><span style={{ fontFamily: mono, fontSize: 11, color: cls[i], fontWeight: 600 }}>{n(s.throughput)} Gbps</span></div><Bar v={typeof s.throughput === "number" ? s.throughput : parseFloat(s.throughput)} max={10} color={cls[i]} h={6} /></div>; })}</div></Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>{slices.map((s, i) => { const cls = [C.teal, C.indigo, C.gold, C.green, C.red]; const iso = typeof s.isolation === "number" ? s.isolation : parseFloat(s.isolation); return <Card key={s.slice_id} style={{ textAlign: "center", cursor: "pointer", border: `1px solid ${selSlice === s.slice_id ? C.tealBorder : C.border}`, transition: "all .15s" }} onClick={() => setSelSlice(selSlice === s.slice_id ? null : s.slice_id)}><div style={{ fontSize: 10, fontWeight: 800, color: cls[i] }}>{s.slice_id}</div><div style={{ fontSize: 11, fontWeight: 600, margin: "4px 0 8px" }}>{s.name}</div><div style={{ display: "flex", justifyContent: "center" }}><Gauge value={iso} /></div><div style={{ marginTop: 6, fontSize: 10, color: C.textMuted, lineHeight: 1.7 }}><div>{n(s.latency)}ms · {n(s.throughput)} Gbps</div><div>{s.sessions} sessions</div></div></Card>; })}</div>
        </div>}

        {tab === "oran" && <div style={{ animation: "fadeUp .3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "5fr 3fr", gap: 14 }}>
            <Card><Head label="O-RAN Components" sub="Disaggregated RAN Health" /><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>{oranComps.map(c => <div key={c.name} style={{ padding: 12, borderRadius: 8, background: C.bg, border: `1px solid ${c.status === "warning" ? C.gold + "30" : c.status === "critical" ? C.red + "30" : C.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><Dot st={c.status} /><span style={{ fontSize: 9, fontFamily: mono, color: c.alerts > 0 ? C.gold : C.textMuted }}>{c.alerts} alerts</span></div><div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{c.name}</div><Bar v={typeof c.load === "number" ? c.load : parseFloat(c.load)} color={c.load > 80 ? C.red : c.load > 65 ? C.gold : C.teal} h={5} /><div style={{ fontSize: 10, fontFamily: mono, color: C.textMuted, textAlign: "right", marginTop: 3 }}>{typeof c.load === "number" ? c.load.toFixed(0) : c.load}%</div></div>)}</div>
              <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>O-RAN Security Topology</div>
                <svg viewBox="0 0 620 165" style={{ width: "100%", height: 155 }}>
                  <rect x="10" y="6" width="600" height="30" rx="6" fill={C.tealLight} stroke={C.teal} strokeWidth=".8" strokeDasharray="5,3" />
                  <text x="310" y="25" textAnchor="middle" fill={C.tealDark} fontSize="10" fontWeight="700" fontFamily="Inter,sans-serif">SMO — Service Management & Orchestration</text>
                  <rect x="30" y="48" width="155" height="28" rx="5" fill={C.white} stroke={C.border} strokeWidth="1" /><text x="108" y="66" textAnchor="middle" fill={C.navy} fontSize="10" fontWeight="600">Non-RT RIC</text>
                  <rect x="210" y="48" width="155" height="28" rx="5" fill={C.white} stroke={C.border} strokeWidth="1" /><text x="288" y="66" textAnchor="middle" fill={C.navy} fontSize="10" fontWeight="600">Near-RT RIC</text>
                  <rect x="400" y="44" width="195" height="36" rx="6" fill="rgba(10,180,184,0.1)" stroke={C.teal} strokeWidth="1.5" /><text x="498" y="62" textAnchor="middle" fill={C.tealDark} fontSize="10" fontWeight="700">⚡ IsoBolt AI Monitor</text><text x="498" y="74" textAnchor="middle" fill={C.textMuted} fontSize="8">Anomaly Detection Layer</text>
                  {[{ x: 40, l: "O-CU-CP" }, { x: 175, l: "O-CU-UP" }, { x: 310, l: "O-DU", w: true }, { x: 440, l: "O-RU" }].map((nd, i) => <g key={i}><rect x={nd.x} y="96" width={105} height="26" rx="5" fill={C.white} stroke={nd.w ? C.gold : C.border} strokeWidth={nd.w ? "1.5" : "1"} /><text x={nd.x + 52} y="113" textAnchor="middle" fill={C.navy} fontSize="10" fontWeight="600">{nd.l}</text></g>)}
                  {[60, 195, 330, 460].map((x, i) => <g key={i}><rect x={x} y="136" width={65} height="18" rx="4" fill={C.bg} stroke={C.border} strokeWidth=".7" /><text x={x + 32} y="149" textAnchor="middle" fill={C.textMuted} fontSize="7">UE Pool {i + 1}</text></g>)}
                  <line x1="108" y1="76" x2="93" y2="96" stroke={C.border} strokeWidth=".8" /><line x1="288" y1="76" x2="228" y2="96" stroke={C.border} strokeWidth=".8" /><line x1="288" y1="76" x2="363" y2="96" stroke={C.border} strokeWidth=".8" />
                </svg>
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card><Head label="xApp Security" sub="RIC Application Integrity" />{xapps.map(a => <div key={a.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, marginBottom: 5, background: a.status === "SUSPICIOUS" ? C.redBg : C.bg, border: `1px solid ${a.status === "SUSPICIOUS" ? C.redBorder : C.border}` }}><span style={{ fontSize: 11, fontFamily: mono }}>{a.name}</span><span style={{ fontSize: 9, fontWeight: 700, color: a.status === "SUSPICIOUS" ? C.red : a.status === "UPDATING" ? C.teal : C.green }}>{a.status}</span></div>)}</Card>
              <Card><Head label="E2 Interface" sub="Control Plane Integrity" /><div style={{ fontFamily: mono, fontSize: 10, color: C.textMid, lineHeight: 2.1 }}><div>Setup Active: <span style={{ color: C.green, fontWeight: 600 }}>{e2.setup_active}</span></div><div>Indication: <span style={{ color: C.green, fontWeight: 600 }}>{e2.indication_per_sec}/sec</span></div><div>Control Req: <span style={{ color: e2.control_per_sec > 900 ? C.gold : C.green, fontWeight: 600 }}>{e2.control_per_sec}/sec</span></div><div>Unauthorized: <span style={{ color: e2.unauthorized_blocked > 0 ? C.red : C.green, fontWeight: 600 }}>{e2.unauthorized_blocked} BLOCKED</span></div></div></Card>
            </div>
          </div>
        </div>}

        {tab === "threats" && <div style={{ animation: "fadeUp .3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Card accent><Head label="Threat Landscape" sub="IsoBolt Intelligence — Last 24h" /><div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>{[{ l: "5G Core Attacks", v: 14, t: 22, c: C.red }, { l: "O-RAN Exploits", v: 3, t: -10, c: C.gold }, { l: "SS7/Diameter", v: 8, t: 45, c: C.red }, { l: "Slice Violations", v: 6, t: 12, c: C.gold }, { l: "GTP Anomalies", v: 11, t: -5, c: C.indigo }, { l: "Supply Chain", v: 2, t: 100, c: C.red }].map(t => <div key={t.l} style={{ padding: 10, borderRadius: 7, background: C.bg, border: `1px solid ${C.border}` }}><Val label={t.l} value={t.v} color={t.c} trend={t.t} /></div>)}</div></Card>
            <Card><Head label="MITRE ATT&CK for Telecom" sub="Detection Coverage" /><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{MITRE.map(m => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 9, fontFamily: mono, color: m.c, width: 50 }}>{m.id}</span><span style={{ fontSize: 10, width: 95, fontWeight: 600 }}>{m.name}</span><div style={{ flex: 1 }}><Bar v={m.n} max={8} color={m.c} h={7} /></div><span style={{ fontSize: 11, fontFamily: mono, color: m.c, width: 18, textAlign: "right", fontWeight: 700 }}>{m.n}</span></div>)}</div></Card>
          </div>
          <Card><Head label="Active Threat Vectors" sub="Mapped to Microscan infrastructure" /><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>{["Vector", "Target", "MITRE", "Severity", "Status", "Mitigation"].map(h => <th key={h} style={{ padding: "8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>)}</tr></thead><tbody>{[{ v: "Rogue xApp Injection", t: "Near-RT RIC", m: "TA0002", s: "critical", st: "Investigating", mt: "E2 interface quarantined" }, { v: "Cross-Slice Lateral Move", t: "URLLC-Edge-DC (S5)", m: "TA0008", s: "critical", st: "Active", mt: "ZTNA enforcement in progress" }, { v: "Diameter Signaling Flood", t: "HSS/UDM", m: "TA0040", s: "warning", st: "Mitigating", mt: "Rate limiting at 2k msg/sec" }, { v: "GTP-U Tunnel Injection", t: "mMTC-IoT UPF", m: "TA0008", s: "warning", st: "Mitigated", mt: "Tunnel rebuilt" }, { v: "OSNR Manipulation", t: "Pune-Mumbai λ-34", m: "TA0007", s: "warning", st: "Monitoring", mt: "Ciena WaveLogic cross-check" }, { v: "Beamforming Deviation", t: "gNB MH-PNE-047", m: "TA0007", s: "info", st: "Resolved", mt: "Environmental cause" }].map((r, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}><td style={{ padding: "8px", fontWeight: 600 }}>{r.v}</td><td style={{ padding: "8px", fontFamily: mono, color: C.tealDark, fontSize: 10 }}>{r.t}</td><td style={{ padding: "8px" }}><span style={{ padding: "1px 6px", borderRadius: 3, background: C.indigoBg, color: C.indigo, fontSize: 10 }}>{r.m}</span></td><td style={{ padding: "8px" }}><SevBadge s={r.s} /></td><td style={{ padding: "8px", fontSize: 10, color: r.st === "Mitigated" || r.st === "Resolved" ? C.green : C.gold, fontWeight: 500 }}>{r.st}</td><td style={{ padding: "8px", fontSize: 10, color: C.textMuted }}>{r.mt}</td></tr>)}</tbody></table></Card>
        </div>}

        {tab === "transport" && <div style={{ animation: "fadeUp .3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Card><Head label="Fiber Ring Protection" sub="Microscan — 1,800+ km Network" />{fiberRings.map(r => <div key={r.name} style={{ padding: 12, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><Dot st={r.status} /><span style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</span></div><span style={{ fontSize: 10, color: C.textMuted }}>{r.km} km</span></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1 }}><Bar v={typeof r.utilization === "number" ? r.utilization : parseFloat(r.utilization)} color={r.utilization > 70 ? C.gold : C.teal} h={6} /></div><span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600 }}>{typeof r.utilization === "number" ? r.utilization.toFixed(0) : r.utilization}%</span></div></div>)}</Card>
            <Card><Head label="Optical Layer Security" sub="Nokia PSE + Ciena WaveLogic 5e" />{[{ p: "OSNR (Avg)", v: `${n(optical.avg_osnr)} dB`, ok: true, d: "C-band average" }, { p: "BER (Pre-FEC)", v: typeof optical.ber === "number" ? optical.ber.toExponential(1) : "2.1e-4", ok: true, d: "Within Nokia PSE-Vs threshold" }, { p: "Chromatic Disp.", v: `${n(optical.chromatic_dispersion)} ps/nm`, ok: true, d: "Ciena coherent DSP compensated" }, { p: "PMD", v: `${n(optical.pmd, 2)} ps`, ok: true, d: "Within 400G tolerance" }, { p: "Fiber Tap Detect", v: optical.fiber_tap_alert ? "1 ALERT" : "CLEAR", ok: !optical.fiber_tap_alert, d: optical.fiber_tap_alert ? "Pune-Mumbai span — monitoring" : "All clear" }].map(i => <div key={i.p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${!i.ok ? C.gold + "25" : C.border}`, marginBottom: 6 }}><Dot st={i.ok ? "healthy" : "warning"} /><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 600 }}>{i.p}</span><span style={{ fontFamily: mono, fontSize: 11, color: i.ok ? C.tealDark : C.gold, fontWeight: 600 }}>{i.v}</span></div><div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{i.d}</div></div></div>)}</Card>
          </div>
          <Card><Head label="DWDM Channel Map" sub={`${dwdm.total_channels} Channels — C-Band — Nokia 1830 PSS`} /><div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>{Array.from({ length: 80 }, (_, i) => { const isA = (i + 1) === dwdm.alert_channel_id; const sh = isA ? C.red : (Math.random() > 0.7 ? C.gold : (Math.random() > 0.4 ? C.teal : C.green)); return <div key={i} title={`λ-${i + 1}${isA ? " — ALERT" : ""}`} style={{ width: 23, height: 23, borderRadius: 4, background: `${sh}10`, border: `1px solid ${sh}${isA ? "45" : "18"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontFamily: mono, color: sh, fontWeight: 600, animation: isA ? "pulse 1.4s infinite" : "none" }}>{i + 1}</div>; })}</div><div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 9, color: C.textMuted }}>{[{ l: "Normal", c: C.green }, { l: "Elevated", c: C.gold }, { l: "Alert", c: C.red }].map(x => <span key={x.l}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: x.c, marginRight: 4, verticalAlign: "middle" }} />{x.l}</span>)}</div></Card>
        </div>}
      </div>

      {/* FOOTER */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 28px", background: C.navy, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={C.teal} strokeWidth="1.5" /><path d="M8 12l2.5 2.5L16 9" stroke={C.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: ".03em" }}><span style={{ color: C.teal, fontWeight: 700 }}>TelcoLearn</span> 2026 — Experience Platform</span>
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: ".04em" }}>IsoBolt SOC v2.7.1 · Microscan Infocommtech · www.TelcoLearn.com</div>
      </div>
    </div>
  );
}
