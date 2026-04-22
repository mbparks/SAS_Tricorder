// ============================================================
// MK-VII FIELD SCANNER
// ------------------------------------------------------------
// MODULE ARCHITECTURE — extension points:
//   • SCAN_MODES       — scanner modes (samples + waveform fn)
//   • DIAGS            — diagnostic drills (React component)
//   • MESSAGE_SOURCES  — ship comm senders (weighted pool)
//   • REACTIONS        — cross-module reactions (match + respond)
//   • EFFECT_HANDLERS  — effect types that reactions can produce
//   • logEntry()       — shared history API; any module can write
//
// EVENT FLOW:
//   Module calls logEntry(entry) →
//     history updated (and persisted to window.storage) →
//     every REACTION whose match(entry, ctx) returns true fires
//     its respond(), which returns an Effect or Effect[]; each
//     effect is handed to the matching EFFECT_HANDLERS entry.
//   Reactions receive a ctx containing the history at that moment,
//   so they can fire conditionally (e.g. "first biosignature ever").
//
// PERSISTENCE:
//   • History is saved to window.storage between sessions.
//
// EXTENSION RECIPES:
//   • New scan mode — push onto SCAN_MODES with
//       { id, label, samples, generatePoints(t,w,h) }.
//   • New diagnostic — component taking { onExit, onComplete }, then
//       push onto DIAGS with { id, name, desc, icon, Component }.
//   • New reaction — push onto REACTIONS with
//       { id, match(entry,ctx), respond(entry,ctx), delay?, chance? }.
//   • New effect type — add to EFFECT_HANDLERS:
//       { my_effect: (effect, api) => { ... } }
// ============================================================

import React, { useState, useEffect, useRef } from "react";

// ─── palette & type ──────────────────────────────────────
const C = {
  bg: "#060809",
  panel: "rgba(18, 26, 30, 0.45)",
  line: "rgba(130, 180, 190, 0.22)",
  lineBright: "rgba(160, 220, 230, 0.45)",
  cyan: "#8fd3d8",
  cyanDim: "#5c8a8f",
  amber: "#d99a4e",
  amberDim: "#8a6332",
  red: "#c25050",
  redDim: "#6a2a2a",
  green: "#7fc88a",
  text: "#b9d0d3",
  textDim: "#5d7377",
  textFaint: "#344247",
};
const mono = {
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace",
  letterSpacing: "0.04em",
};

// ─── shared utilities ────────────────────────────────────
const pickRandom = (a) => a[Math.floor(Math.random() * a.length)];
const nowTime = () => new Date().toTimeString().slice(0, 5);
const nowTimeFull = () => new Date().toTimeString().slice(0, 8);
const riskColor = (r) =>
  ({ NONE: C.green, LOW: C.green, CAUTION: C.amber, UNKNOWN: C.amber,
    HIGH: C.red, EXTREME: C.red, "—": C.textDim }[r] || C.textDim);

// ─── primitives ──────────────────────────────────────────
const Dot = ({ color, blink }) => (
  <span style={{
    display: "inline-block", width: 6, height: 6, borderRadius: 999,
    background: color, boxShadow: `0 0 6px ${color}`,
    animation: blink ? "blink 1.4s ease-in-out infinite" : undefined,
    verticalAlign: "middle", marginRight: 4,
  }}/>
);
const Label = ({ children, size = 9, color = C.textDim, spacing = "0.28em" }) => (
  <div style={{ ...mono, fontSize: size, color, letterSpacing: spacing, textTransform: "uppercase" }}>
    {children}
  </div>
);

// ============================================================
// MODULE — SCAN_MODES
// Each entry owns its samples AND its waveform generator.
// Adding a mode here auto-populates the mode selector and the
// spectrogram without touching other code.
// ============================================================
const SCAN_MODES = [
  {
    id: "BIO",
    label: "BIO",
    samples: [
      { subject: "Bipedal mammal", spec: "Primate / Hominid · 72.4 kg",
        vitals: [["HR","68 bpm",C.green],["BP","118 / 76",C.green],["NEURAL","θ-dom",C.cyan],["TEMP","36.9°C",C.green]],
        notes: "Sympathetic response elevated. Otherwise healthy.", risk: "LOW" },
      { subject: "Vascular flora", spec: "Class-M photosynthetic",
        vitals: [["pH","6.8",C.green],["HYDRO","74%",C.cyan],["PHOTO","active",C.green],["TOXIN","none",C.green]],
        notes: "Healthy specimen. Trace bioluminescence in stem.", risk: "NONE" },
      { subject: "Crystalline entity", spec: "Silicon-based · 410 kg · unknown phylum",
        vitals: [["RES","2.4 MΩ",C.amber],["PULSE","0.13 Hz",C.amber],["TEMP","−41°C",C.cyan],["INTENT","?",C.amber]],
        notes: "Lifesign atypical. Movement irregular. Do not touch.", risk: "CAUTION" },
      { subject: "Microbial mat", spec: "Thermoacidophilic archaea",
        vitals: [["DENS","1e9/ml",C.green],["VIRAL","none",C.green],["pH","2.1",C.amber],["METAB","sulfuric",C.amber]],
        notes: "Extremophile colony. Surface is caustic on contact.", risk: "LOW" },
      { subject: "No lifeforms", spec: "Environment appears sterile",
        vitals: [["BIO","null",C.textDim],["ORG","trace",C.textDim],["DNA","0",C.textDim],["AMINO","0",C.textDim]],
        notes: "Nothing within sensor range. Expand radius?", risk: "—" },
    ],
    generatePoints: (t, w, h) => {
      const pts = [], cy = h / 2;
      for (let x = 0; x <= w; x += 2) {
        const phase = ((x + t * 90) % 140) / 140;
        let y = Math.sin(x * 0.3 + t * 3) * 1.4;
        if (phase > 0.42 && phase < 0.46) y = -24;
        else if (phase >= 0.46 && phase < 0.52) y = 16;
        pts.push([x, cy + y]);
      }
      return pts;
    },
  },
  {
    id: "GEO",
    label: "GEO",
    samples: [
      { subject: "Basaltic rock", spec: "Igneous · volcanic · ~4.4 Gyr",
        vitals: [["SiO₂","49%",C.cyan],["Fe","11%",C.amber],["Mg","8%",C.cyan],["H₂O","trace",C.textDim]],
        notes: "Typical mare-type composition. No anomalies.", risk: "NONE" },
      { subject: "Ferrous meteorite", spec: "Iron-nickel · M-type · ~4.6 Gyr",
        vitals: [["Fe","91%",C.amber],["Ni","7.8%",C.cyan],["Co","0.5%",C.cyan],["Ir","3 ppm",C.amber]],
        notes: "Widmanstätten pattern intact. Exogenic origin.", risk: "NONE" },
      { subject: "Unknown lattice", spec: "Crystalline · aperiodic · ??? Myr",
        vitals: [["HARD","9.8 Mohs",C.amber],["SYM","non-eucl.",C.amber],["RES","super-c",C.cyan],["ORIG","?",C.amber]],
        notes: "Structure defies known mineralogy. Flag for retrieval.", risk: "UNKNOWN" },
      { subject: "Sedimentary strata", spec: "Marine deposit · ~320 Myr",
        vitals: [["CaCO₃","62%",C.cyan],["Clay","28%",C.cyan],["FOSSIL","yes",C.green],["LAYERS","14",C.cyan]],
        notes: "Preserved microfossils visible under 40x mag.", risk: "NONE" },
    ],
    generatePoints: (t, w, h) => {
      const pts = [], cy = h / 2;
      for (let x = 0; x <= w; x += 5) {
        const mag = Math.abs(Math.sin(x * 0.11 + t * 0.35) + Math.sin(x * 0.31 + t * 0.9) * 0.7) * 16;
        pts.push([x, cy - mag]); pts.push([x + 2, cy + mag]);
      }
      return pts;
    },
  },
  {
    id: "ATMO",
    label: "ATMO",
    samples: [
      { subject: "Class-M atmosphere", spec: "Nitrogen-oxygen · 1.013 bar",
        vitals: [["N₂","78.1%",C.cyan],["O₂","20.9%",C.green],["CO₂","0.04%",C.cyan],["TEMP","+22°C",C.green]],
        notes: "Breathable. No detected pathogens or allergens.", risk: "NONE" },
      { subject: "Methane haze", spec: "Reducing atmosphere · 1.6 bar",
        vitals: [["CH₄","4.2%",C.amber],["N₂","95%",C.cyan],["O₂","0%",C.red],["TEMP","−179°C",C.cyan]],
        notes: "Not breathable. Ignition hazard at trace O₂.", risk: "HIGH" },
      { subject: "Dense CO₂", spec: "Venusian analogue · 3.8 bar",
        vitals: [["CO₂","96.5%",C.red],["N₂","3.5%",C.cyan],["SO₂","150 ppm",C.amber],["TEMP","+462°C",C.red]],
        notes: "Lethal. EVA strongly contraindicated.", risk: "EXTREME" },
      { subject: "Near-vacuum", spec: "Exospheric traces · <0.001 bar",
        vitals: [["Ar","dom",C.cyan],["He","trace",C.cyan],["O₂","0%",C.red],["TEMP","−220°C",C.cyan]],
        notes: "Pressure suit mandatory. No convective heat loss.", risk: "EXTREME" },
    ],
    generatePoints: (t, w, h) => {
      const pts = [], cy = h / 2;
      for (let x = 0; x <= w; x += 3) {
        const y = Math.sin(x * 0.04 + t * 0.9) * 14 + Math.sin(x * 0.09 + t * 1.6) * 6 + Math.sin(x * 0.15 + t * 0.3) * 3;
        pts.push([x, cy + y]);
      }
      return pts;
    },
  },
  {
    id: "EM",
    label: "EM",
    samples: [
      { subject: "Coherent pulse", spec: "Narrowband · 1420.4 MHz",
        vitals: [["SNR","41 dB",C.green],["BW","2 kHz",C.cyan],["MOD","none",C.cyan],["DRIFT","0.00",C.green]],
        notes: "Hydrogen-line emission. Probable natural source.", risk: "NONE" },
      { subject: "Broadband noise", spec: "Thermal · 10 MHz – 8 GHz",
        vitals: [["FLUX","0.9 Jy",C.cyan],["POL","random",C.cyan],["SRC","diffuse",C.textDim],["TEMP","2.7 K",C.cyan]],
        notes: "Background microwave radiation. No structure.", risk: "NONE" },
      { subject: "Encrypted signal", spec: "Modulated · 2.4 GHz",
        vitals: [["MOD","QAM-256",C.amber],["RATE","50 Mb/s",C.amber],["KEY","unsolved",C.red],["DUR","ongoing",C.amber]],
        notes: "Structured. Cipher exceeds onboard decryptor.", risk: "CAUTION" },
      { subject: "Subspace harmonic", spec: "Non-luminal distortion",
        vitals: [["Ψ","0.042",C.amber],["CURV","+0.8",C.amber],["TACH","yes",C.amber],["CHRON","+3.1 ms",C.amber]],
        notes: "Causality margins narrow. Reassess in 60 s.", risk: "CAUTION" },
    ],
    generatePoints: (t, w, h) => {
      const pts = [], cy = h / 2;
      for (let x = 0; x <= w; x += 2) {
        const y = (Math.sin(x * 0.4 + t * 5) + Math.sin(x * 0.9 + t * 8) * 0.6 + Math.sin(x * 1.7 + t * 13) * 0.4) * 11;
        pts.push([x, cy + y]);
      }
      return pts;
    },
  },
];
const getMode = (id) => SCAN_MODES.find((m) => m.id === id) || SCAN_MODES[0];

// ============================================================
// MODULE — MESSAGE_SOURCES
// Weighted pool of ship communications. Each source declares
// its weight (relative frequency) and message pool.
// ============================================================
const MESSAGE_SOURCES = {
  BRIDGE:      { weight: 3, messages: [
    "Status check — all away team members report in.",
    "Receiving your scan packets. Telemetry clean.",
    "Orbital window closes in 42 min. Acknowledge.",
  ]},
  CAPTAIN:     { weight: 4, messages: [
    "Careful down there. The atmosphere is acting up.",
    "Keep eyes on the crystalline formation at 042.",
    "Cosmo is staring at the airlock again. I think he misses you.",
    "Back in 20 min or we send the search party.",
  ]},
  ENGINEERING: { weight: 3, messages: [
    "Warp coil harmonics nominal. You're clear to proceed.",
    "If your MK-VII lags, toggle EM shielding off-on.",
    "Replicator is out of coffee again. Just so you know.",
  ]},
  "MED BAY":   { weight: 2, messages: [
    "Transmit vitals on return. Dr. Vance standing by.",
    "Hydrate. Away missions deplete electrolytes fast.",
    "Reminder: no touching the crystalline entity. Please.",
  ]},
  SCIENCE:     { weight: 2, messages: [
    "Upload raw GEO data when you can. Dr. Imani is waiting.",
    "Anything bio yet? We're low on samples this cycle.",
  ]},
  TACTICAL:    { weight: 2, messages: [
    "Unknown EM source in your quadrant. Eyes up.",
    "Perimeter still clean. Maintain position.",
  ]},
  HELM:        { weight: 1, messages: [
    "Minor orbital drift corrected. Beam-up vector holds.",
  ]},
  COOK:        { weight: 1, messages: [
    "Saving you the last of the plomeek soup. Hurry.",
  ]},
  COMMS:       { weight: 1, messages: [
    "Signal degradation detected. Switching to backup array.",
  ]},
  SECURITY:    { weight: 1, messages: [
    "No hostile signatures on long range. Enjoy the view.",
  ]},
};
const generateShipMessage = () => {
  const total = Object.values(MESSAGE_SOURCES).reduce((s, v) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [from, src] of Object.entries(MESSAGE_SOURCES)) {
    r -= src.weight;
    if (r <= 0) return { from, txt: pickRandom(src.messages) };
  }
  return { from: "BRIDGE", txt: pickRandom(MESSAGE_SOURCES.BRIDGE.messages) };
};

// ============================================================
// SHARED UI
// ============================================================

function Spectrogram({ modeId, scanning, progress }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf; const loop = () => { setT(Date.now() / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  const w = 340, h = 104;
  const mode = getMode(modeId);
  const pts = mode.generatePoints(t, w, h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height: h }}>
      {[0.25, 0.5, 0.75].map((r) => (
        <line key={"h" + r} x1={0} y1={h * r} x2={w} y2={h * r} stroke={C.line} strokeWidth="0.4" strokeDasharray="2 4" />
      ))}
      {[0.2, 0.4, 0.6, 0.8].map((r) => (
        <line key={"v" + r} x1={w * r} y1={0} x2={w * r} y2={h} stroke={C.line} strokeWidth="0.4" strokeDasharray="2 4" />
      ))}
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.cyan} strokeWidth="1.2" opacity="0.9"
        style={{ filter: `drop-shadow(0 0 3px ${C.cyan})` }}/>
      {scanning && (<>
        <rect x={0} y={0} width={(w * progress) / 100} height={h} fill={C.amber} opacity="0.05" />
        <line x1={(w * progress) / 100} y1={0} x2={(w * progress) / 100} y2={h} stroke={C.amber} strokeWidth="1" opacity="0.9"
          style={{ filter: `drop-shadow(0 0 6px ${C.amber})` }}/>
      </>)}
    </svg>
  );
}

const VitalCell = ({ k, v, color }) => (
  <div style={{ border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 4px",
    background: "rgba(0,0,0,0.3)", textAlign: "center", minWidth: 0 }}>
    <Label size={8}>{k}</Label>
    <div style={{ ...mono, fontSize: 12, color, marginTop: 4,
      textShadow: `0 0 6px ${color}55`, overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
  </div>
);

const ModeBtn = ({ label, active, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    ...mono, fontSize: 11, letterSpacing: "0.3em", padding: "10px 4px",
    border: `1px solid ${active ? C.cyan : C.line}`,
    background: active ? `${C.cyan}18` : "transparent",
    color: active ? C.cyan : C.textDim, borderRadius: 4,
    cursor: disabled ? "default" : "pointer", flex: 1,
    textShadow: active ? `0 0 6px ${C.cyan}66` : "none",
    opacity: disabled && !active ? 0.4 : 1, transition: "all 0.15s",
  }}>{label}</button>
);

const Tab = ({ label, active, onClick, badge }) => (
  <button onClick={onClick} style={{
    ...mono, flex: 1, padding: "11px 2px", fontSize: 10, letterSpacing: "0.25em",
    border: `1px solid ${active ? C.cyan : C.line}`,
    background: active ? `${C.cyan}18` : "transparent",
    color: active ? C.cyan : C.textDim, borderRadius: 4, cursor: "pointer",
    textShadow: active ? `0 0 6px ${C.cyan}66` : "none", position: "relative",
  }}>
    {label}
    {badge > 0 && (
      <span style={{
        position: "absolute", top: 3, right: 4, background: C.amber, color: C.bg,
        fontSize: 8, padding: "1px 5px", borderRadius: 8, minWidth: 14,
        textAlign: "center", fontWeight: "bold", boxShadow: `0 0 6px ${C.amber}`, letterSpacing: 0,
      }}>{badge}</span>
    )}
  </button>
);

const Toast = ({ msg }) => (
  <div style={{
    position: "absolute", top: 70, left: 0, right: 0, zIndex: 20,
    background: "rgba(16,12,4,0.96)", border: `1px solid ${C.amber}`,
    borderRadius: 4, padding: "10px 12px", boxShadow: `0 0 18px ${C.amber}55`,
    animation: "toast-in 0.35s cubic-bezier(.2,.7,.2,1)",
  }}>
    <div style={{ ...mono, fontSize: 9, color: C.amber, letterSpacing: "0.3em",
      marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
      <span>▮ INCOMING · {msg.from}</span>
      <span style={{ color: C.amberDim }}>{msg.time}</span>
    </div>
    <div style={{ ...mono, fontSize: 11, color: C.text, lineHeight: 1.4 }}>{msg.txt}</div>
  </div>
);

// ============================================================
// VIEW — DIAG (game menu + games)
// Games receive { onExit, onComplete } props. onComplete writes
// a structured entry to the shared history log.
// ============================================================

function DiagMenu({ onSelect }) {
  return (
    <div style={{ padding: "12px 0" }}>
      <Label size={8} color={C.cyanDim}>AVAILABLE DIAGNOSTICS</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {DIAGS.map((g) => (
          <button key={g.id} onClick={() => onSelect(g.id)} style={{
            ...mono, textAlign: "left", padding: "14px",
            border: `1px solid ${C.line}`, borderRadius: 6,
            background: "rgba(0,0,0,0.4)", color: C.cyan,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{ fontSize: 22, color: C.cyan, textShadow: `0 0 8px ${C.cyan}66` }}>{g.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, letterSpacing: "0.3em", textShadow: `0 0 6px ${C.cyan}66` }}>{g.name}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: "0.15em", marginTop: 4 }}>{g.desc}</div>
            </div>
            <div style={{ color: C.cyanDim, fontSize: 14 }}>▶</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "10px", border: `1px dashed ${C.line}`, borderRadius: 4, textAlign: "center" }}>
        <Label size={8} color={C.textFaint}>MORE DRILLS IN FW 2.8</Label>
      </div>
    </div>
  );
}

function SignalLockGame({ onExit, onComplete }) {
  const TOTAL = 5;
  const [round, setRound] = useState(1);
  const [pos, setPos] = useState(50);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(false);
  const reportedRef = useRef(false);
  const zoneSize = Math.max(8, 22 - round * 3);
  const speed = 0.5 + round * 0.3;

  useEffect(() => {
    if (done || result) return;
    let raf; const start = Date.now();
    const tick = () => {
      const tt = (Date.now() - start) / 1000;
      setPos(50 + Math.sin(tt * speed * Math.PI) * 46);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [round, done, result, speed]);

  const grade = score >= 400 ? "PASS" : score >= 250 ? "MARGINAL" : "RECAL REQUIRED";
  const gradeColor = score >= 400 ? C.green : score >= 250 ? C.amber : C.red;

  useEffect(() => {
    if (done && !reportedRef.current) {
      reportedRef.current = true;
      onComplete?.({
        kind: "diag", title: "Signal Lock",
        subtitle: `${grade} · ${score} pts`, color: gradeColor,
        data: { game: "signal", score, grade, rounds: TOTAL },
      });
    }
  }, [done, grade, gradeColor, score, onComplete]);

  const lock = () => {
    if (done || result) return;
    const d = Math.abs(pos - 50);
    let r, p;
    if (d < zoneSize / 4) { r = "PERFECT LOCK"; p = 100; }
    else if (d < zoneSize / 2) { r = "LOCKED"; p = 50; }
    else if (d < zoneSize) { r = "GRAZE"; p = 20; }
    else { r = "MISS"; p = 0; }
    setResult({ r, p }); setScore((s) => s + p);
    setTimeout(() => {
      setResult(null);
      if (round >= TOTAL) setDone(true);
      else setRound((x) => x + 1);
    }, 1100);
  };

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "50px 10px" }}>
        <Label size={9} color={C.cyanDim}>DIAGNOSTIC COMPLETE</Label>
        <div style={{ ...mono, fontSize: 32, color: gradeColor, marginTop: 14, textShadow: `0 0 14px ${gradeColor}88` }}>{score} pts</div>
        <div style={{ ...mono, fontSize: 12, color: gradeColor, letterSpacing: "0.35em", marginTop: 8 }}>{grade}</div>
        <button onClick={onExit} style={{ ...mono, marginTop: 28, padding: "12px 22px",
          border: `1px solid ${C.cyan}`, background: `${C.cyan}14`, color: C.cyan,
          borderRadius: 4, cursor: "pointer", letterSpacing: "0.35em", fontSize: 11 }}>◀ EXIT</button>
      </div>
    );
  }

  const rc = result ? (result.p >= 100 ? C.green : result.p >= 50 ? C.cyan : result.p >= 20 ? C.amber : C.red) : C.cyan;
  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <Label size={9}>ROUND {round} / {TOTAL}</Label>
        <Label size={9} color={C.cyan}>{score} PTS</Label>
      </div>
      <Label size={8} color={C.cyanDim}>TAP LOCK WHEN INSIDE THE ZONE</Label>
      <div style={{
        position: "relative", height: 80, background: "rgba(0,0,0,0.55)",
        border: `1px solid ${C.line}`, borderRadius: 4, marginTop: 10, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: `${50 - zoneSize / 2}%`, top: 0,
          width: `${zoneSize}%`, height: "100%", background: `${C.green}22`,
          borderLeft: `1px solid ${C.green}`, borderRight: `1px solid ${C.green}`,
        }}/>
        <div style={{ position: "absolute", left: "50%", top: 0, width: 1, height: "100%",
          background: C.green, boxShadow: `0 0 6px ${C.green}`, transform: "translateX(-50%)" }}/>
        <div style={{
          position: "absolute", left: `${pos}%`, top: 0, width: 2, height: "100%",
          background: C.cyan, boxShadow: `0 0 10px ${C.cyan}`, transform: "translateX(-50%)",
        }}/>
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((i) => (
          <div key={i} style={{ position: "absolute", left: `${i}%`, bottom: 0, width: 1,
            height: i === 50 ? 10 : i % 50 === 0 ? 8 : 4, background: C.line }}/>
        ))}
      </div>
      <div style={{ height: 38, textAlign: "center", marginTop: 10 }}>
        {result && (
          <>
            <div style={{ ...mono, fontSize: 15, color: rc, letterSpacing: "0.35em", textShadow: `0 0 8px ${rc}88` }}>{result.r}</div>
            <div style={{ ...mono, fontSize: 10, color: C.textDim, marginTop: 3 }}>+{result.p} pts</div>
          </>
        )}
      </div>
      <button onClick={lock} disabled={!!result} style={{
        ...mono, width: "100%", padding: "16px", fontSize: 15, letterSpacing: "0.5em",
        border: `2px solid ${C.cyan}`, background: `${C.cyan}14`, color: C.cyan,
        borderRadius: 6, cursor: result ? "default" : "pointer",
        textShadow: `0 0 10px ${C.cyan}`, animation: result ? "none" : "idle-pulse 2.4s ease-in-out infinite",
      }}>◉ LOCK</button>
      <button onClick={onExit} style={{ ...mono, width: "100%", marginTop: 8, padding: "8px",
        border: `1px solid ${C.line}`, background: "transparent", color: C.textDim,
        borderRadius: 4, cursor: "pointer", fontSize: 10, letterSpacing: "0.3em" }}>◀ ABORT</button>
    </div>
  );
}

function DecryptGame({ onExit, onComplete }) {
  const GLYPHS = ["╬", "╳", "◎", "◈", "⟁", "⬢", "⬡", "▣", "◇"];
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [input, setInput] = useState([]);
  const [phase, setPhase] = useState("init");
  const [highlighted, setHighlighted] = useState(null);
  const [best, setBest] = useState(0);
  const reportedRef = useRef(false);

  const playRound = (r) => {
    const len = 2 + r;
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9));
    setSequence(seq); setInput([]); setPhase("showing");
    seq.forEach((idx, i) => {
      setTimeout(() => {
        setHighlighted(idx);
        setTimeout(() => setHighlighted(null), 320);
      }, i * 620 + 500);
    });
    setTimeout(() => setPhase("input"), seq.length * 620 + 550);
  };

  useEffect(() => { playRound(1); }, []);

  useEffect(() => {
    if (phase === "done" && !reportedRef.current) {
      reportedRef.current = true;
      const color = best >= 5 ? C.green : best >= 3 ? C.amber : C.red;
      onComplete?.({
        kind: "diag", title: "Decrypt Cipher",
        subtitle: `${best} glyph${best === 1 ? "" : "s"} decoded`, color,
        data: { game: "decrypt", best },
      });
    }
  }, [phase, best, onComplete]);

  const tap = (idx) => {
    if (phase !== "input") return;
    const next = [...input, idx];
    if (idx !== sequence[next.length - 1]) {
      setPhase("wrong");
      setBest((b) => Math.max(b, round - 1));
      setTimeout(() => setPhase("done"), 1400);
      return;
    }
    setInput(next);
    if (next.length === sequence.length) {
      setPhase("correct");
      setBest((b) => Math.max(b, round));
      setTimeout(() => {
        const nr = round + 1;
        setRound(nr); playRound(nr);
      }, 900);
    }
  };

  if (phase === "done") {
    return (
      <div style={{ textAlign: "center", padding: "50px 10px" }}>
        <Label size={9} color={C.cyanDim}>DECRYPT COMPLETE</Label>
        <div style={{ ...mono, fontSize: 32, color: C.cyan, marginTop: 14, textShadow: `0 0 14px ${C.cyan}88` }}>{best}</div>
        <div style={{ ...mono, fontSize: 10, color: C.textDim, letterSpacing: "0.3em", marginTop: 6 }}>
          LONGEST SEQUENCE DECODED
        </div>
        <button onClick={onExit} style={{ ...mono, marginTop: 28, padding: "12px 22px",
          border: `1px solid ${C.cyan}`, background: `${C.cyan}14`, color: C.cyan,
          borderRadius: 4, cursor: "pointer", letterSpacing: "0.35em", fontSize: 11 }}>◀ EXIT</button>
      </div>
    );
  }

  const status = {
    init:    { t: "INITIALIZING…", c: C.textDim },
    showing: { t: `OBSERVE · ${sequence.length} GLYPHS`, c: C.amber },
    input:   { t: `ENTER · ${input.length} / ${sequence.length}`, c: C.cyan },
    correct: { t: "DECRYPT CONFIRMED", c: C.green },
    wrong:   { t: "CIPHER MISMATCH", c: C.red },
  }[phase];

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <Label size={9}>CIPHER LV {round}</Label>
        <Label size={9} color={C.cyan}>BEST {best}</Label>
      </div>
      <div style={{
        textAlign: "center", padding: "10px 0", ...mono, fontSize: 11, letterSpacing: "0.35em",
        color: status.c, textShadow: `0 0 6px ${status.c}66`, marginBottom: 10,
        minHeight: 16, transition: "color 0.3s",
      }}>► {status.t}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {GLYPHS.map((g, i) => {
          const on = highlighted === i;
          return (
            <button key={i} onClick={() => tap(i)} disabled={phase !== "input"} style={{
              ...mono, aspectRatio: "1 / 1", fontSize: 32,
              border: `1px solid ${on ? C.amber : C.line}`,
              background: on ? `${C.amber}44` : "rgba(0,0,0,0.45)",
              color: on ? C.amber : C.cyan, borderRadius: 6,
              cursor: phase === "input" ? "pointer" : "default",
              textShadow: on ? `0 0 14px ${C.amber}` : `0 0 6px ${C.cyan}55`,
              transition: "all 0.12s",
              opacity: phase === "wrong" ? 0.5 : 1,
            }}>{g}</button>
          );
        })}
      </div>
      <button onClick={onExit} style={{ ...mono, width: "100%", marginTop: 14, padding: "8px",
        border: `1px solid ${C.line}`, background: "transparent", color: C.textDim,
        borderRadius: 4, cursor: "pointer", fontSize: 10, letterSpacing: "0.3em" }}>◀ ABORT</button>
    </div>
  );
}

// ============================================================
// MODULE — DIAGS
// Registry of available diagnostic drills. Each one plugs into
// the DIAG view automatically.
// ============================================================
const DIAGS = [
  { id: "signal",  name: "SIGNAL LOCK",    desc: "Timing drill · sensor calibration",    icon: "◉", Component: SignalLockGame },
  { id: "decrypt", name: "DECRYPT CIPHER", desc: "Pattern recognition · glyph sequence", icon: "▦", Component: DecryptGame },
];
const getDiag = (id) => DIAGS.find((d) => d.id === id);

// ============================================================
// MODULE — REACTIONS
// Each reaction listens for a kind of log entry and produces
// effects. The dispatch is ordered: iterate REACTIONS in order,
// match(entry, ctx) decides whether to fire, respond(entry, ctx)
// returns an Effect or Effect[] to be handled by EFFECT_HANDLERS.
//
// Shape:
//   { id, match(entry, ctx) -> bool,
//     respond(entry, ctx) -> Effect | Effect[] | null,
//     delay?: ms,    chance?: 0..1 }
//
// ctx.history is the history BEFORE the current entry, so reactions
// can check "is this the first X?" type conditions.
// ============================================================
const REACTIONS = [
  // ─── scan reactions ──────────────────────────────
  {
    id: "first-biosign",
    match: (e, ctx) => e.kind === "scan" && e.data?.mode === "BIO"
      && !ctx.history.some((h) => h.kind === "scan" && h.data?.mode === "BIO"),
    delay: 3200,
    respond: () => ({
      type: "ship_message", from: "SCIENCE",
      txt: "First biosignature of the mission — logged and catalogued.",
    }),
  },
  {
    id: "extreme-risk",
    match: (e) => e.kind === "scan" && e.data?.risk === "EXTREME",
    delay: 4500,
    respond: () => ({
      type: "ship_message", from: "CAPTAIN",
      txt: "Extreme hazard on that last reading. Fall back if you have to.",
    }),
  },
  {
    id: "high-risk",
    match: (e) => e.kind === "scan" && e.data?.risk === "HIGH",
    delay: 5000,
    respond: () => ({
      type: "ship_message", from: "MED BAY",
      txt: "High-risk scan just came through. Keep your suit sealed.",
    }),
  },
  {
    id: "unknown-anomaly",
    match: (e) => e.kind === "scan" && e.data?.risk === "UNKNOWN",
    delay: 4000,
    respond: (e) => ({
      type: "ship_message", from: "SCIENCE",
      txt: `That ${e.data.mode} anomaly is fascinating — run it again if you can.`,
    }),
  },
  // ─── diag reactions ──────────────────────────────
  {
    id: "diag-pass",
    match: (e) => e.kind === "diag" && e.data?.grade === "PASS",
    chance: 0.7,
    delay: 3500,
    respond: () => ({
      type: "ship_message", from: "ENGINEERING",
      txt: "Nice calibration. Sensor drift well within spec.",
    }),
  },
  {
    id: "decrypt-master",
    match: (e) => e.kind === "diag" && e.data?.game === "decrypt" && e.data?.best >= 5,
    delay: 3500,
    respond: () => ({
      type: "ship_message", from: "COMMS",
      txt: "Impressive cipher work. I couldn't get past four.",
    }),
  },
];

// ============================================================
// MODULE — EFFECT_HANDLERS
// Map of effect type -> handler. Reactions produce declarative
// Effect objects; handlers translate them to side effects.
// New effect types are added by adding an entry here.
// ============================================================
const EFFECT_HANDLERS = {
  ship_message: (effect, api) => {
    api.pushMsg({ from: effect.from, txt: effect.txt });
  },
  // future: system_log, toast, sound, etc.
};

const dispatchEffects = (out, api) => {
  if (!out) return;
  const list = Array.isArray(out) ? out : [out];
  for (const effect of list) {
    const handler = EFFECT_HANDLERS[effect?.type];
    if (handler) { try { handler(effect, api); } catch (_) { /* effect error */ } }
  }
};

// ============================================================
// VIEW — COMMS
// ============================================================
function CommsView({ messages }) {
  if (messages.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 10px" }}>
        <div style={{ ...mono, fontSize: 11, color: C.textDim, letterSpacing: "0.3em" }}>◯ NO TRANSMISSIONS</div>
        <div style={{ ...mono, fontSize: 9, color: C.textFaint, marginTop: 8, letterSpacing: "0.2em" }}>STANDING BY FOR SHIP COMMS</div>
      </div>
    );
  }
  return (
    <div style={{ padding: "8px 0 4px", maxHeight: "62vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <Label size={8} color={C.cyanDim}>SHIP TRANSMISSIONS</Label>
        <Label size={8} color={C.amber}>◉ LIVE</Label>
      </div>
      {messages.map((m) => (
        <div key={m.id} style={{
          borderLeft: `2px solid ${C.amber}`, background: "rgba(26,16,4,0.35)",
          padding: "10px 12px", marginBottom: 7, borderRadius: "0 4px 4px 0",
          animation: m.fresh ? "toast-in 0.35s ease-out" : undefined,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ ...mono, fontSize: 10, color: C.amber, letterSpacing: "0.25em" }}>▮ {m.from}</span>
            <span style={{ ...mono, fontSize: 9, color: C.textDim }}>{m.time}</span>
          </div>
          <div style={{ ...mono, fontSize: 11, color: C.text, lineHeight: 1.5 }}>{m.txt}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// VIEW — LOG (history)
// Any module that calls logEntry() shows up here.
// ============================================================
function HistoryView({ history, onClear }) {
  const [confirm, setConfirm] = useState(false);
  const clearTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(clearTimerRef.current), []);

  const handleClear = () => {
    if (confirm) {
      onClear(); setConfirm(false);
      clearTimeout(clearTimerRef.current);
    } else {
      setConfirm(true);
      clearTimerRef.current = setTimeout(() => setConfirm(false), 2500);
    }
  };

  if (history.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 10px" }}>
        <div style={{ ...mono, fontSize: 11, color: C.textDim, letterSpacing: "0.3em" }}>◯ NO ACTIVITY LOGGED</div>
        <div style={{ ...mono, fontSize: 9, color: C.textFaint, marginTop: 8, letterSpacing: "0.2em" }}>
          SCANS AND DIAGNOSTICS WILL APPEAR HERE
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0 4px", maxHeight: "62vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Label size={8} color={C.cyanDim}>ACTIVITY LOG · {history.length}</Label>
        <button onClick={handleClear} style={{
          ...mono, fontSize: 8, color: confirm ? C.red : C.redDim,
          letterSpacing: "0.3em", background: "transparent",
          border: `1px solid ${confirm ? C.red : C.line}`,
          padding: "3px 8px", borderRadius: 3, cursor: "pointer",
          transition: "all 0.15s",
        }}>
          {confirm ? "TAP AGAIN" : "CLEAR"}
        </button>
      </div>
      {history.map((e) => (
        <div key={e.id} style={{
          borderLeft: `2px solid ${e.color}`, background: "rgba(0,0,0,0.35)",
          padding: "9px 12px", marginBottom: 6, borderRadius: "0 4px 4px 0",
        }}>
          <div style={{ ...mono, fontSize: 8, color: C.textDim, letterSpacing: "0.3em", marginBottom: 4 }}>
            {e.timeStr} · {e.kind.toUpperCase()}
          </div>
          <div style={{ ...mono, fontSize: 12, color: C.text, lineHeight: 1.3 }}>{e.title}</div>
          <div style={{ ...mono, fontSize: 9, color: e.color, marginTop: 3, letterSpacing: "0.18em",
            textShadow: `0 0 4px ${e.color}44` }}>
            {e.subtitle}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN
// Holds shared state. Exposes logEntry() for cross-module use.
// ============================================================
export default function Tricorder() {
  // navigation
  const [view, setView] = useState("scan");
  const [game, setGame] = useState(null);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // scanner state
  const [mode, setMode] = useState("BIO");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sample, setSample] = useState(null);
  const [scanLog, setScanLog] = useState([]);
  const [scanCount, setScanCount] = useState(0);

  // clock
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);

  // comms state
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // history state (persisted via window.storage)
  const [history, setHistory] = useState([]);
  const hydratedRef = useRef(false);
  // always points to latest history, for reaction ctx (ref avoids
  // stale closures when logEntry fires from timers or async chains)
  const historyRef = useRef([]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // load history from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage?.get?.("history");
        if (res?.value) setHistory(JSON.parse(res.value));
      } catch (_) { /* no prior history */ }
      hydratedRef.current = true;
    })();
  }, []);

  // save history when it changes (after hydration)
  useEffect(() => {
    if (!hydratedRef.current) return;
    (async () => {
      try { await window.storage?.set?.("history", JSON.stringify(history)); }
      catch (_) { /* storage unavailable; in-memory only */ }
    })();
  }, [history]);

  // ── shared APIs ──────────────────────────────────────
  const pushMsg = (msg) => {
    const entry = { ...msg, time: nowTime(), id: Date.now() + Math.random(), fresh: true };
    setMessages((p) => [entry, ...p].slice(0, 40));
    if (viewRef.current !== "comms") {
      setUnread((u) => u + 1);
      setToast(entry);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 3800);
    }
    setTimeout(() => setMessages((p) => p.map((m) => m.id === entry.id ? { ...m, fresh: false } : m)), 500);
  };

  // logEntry — shared history API. Any module can call this.
  // Writes to history, then iterates the REACTIONS registry; each
  // matching reaction produces Effect(s) dispatched via EFFECT_HANDLERS.
  const logEntry = (entry) => {
    const enriched = {
      ...entry,
      id: Date.now() + Math.random(),
      ts: Date.now(),
      timeStr: nowTime(),
    };

    // Snapshot history BEFORE this entry, so reactions can reason
    // about "is this the first X?" cleanly.
    const ctx = { history: historyRef.current };
    const api = { pushMsg };

    for (const reaction of REACTIONS) {
      let fires;
      try { fires = reaction.match(enriched, ctx); }
      catch (_) { continue; /* bad matcher; skip */ }
      if (!fires) continue;
      if (Math.random() >= (reaction.chance ?? 1)) continue;

      const delay = reaction.delay ?? 0;
      setTimeout(() => {
        try {
          const out = reaction.respond(enriched, ctx);
          dispatchEffects(out, api);
        } catch (_) { /* bad responder; swallow */ }
      }, delay);
    }

    setHistory((h) => [enriched, ...h].slice(0, 100));
  };

  const clearHistory = () => setHistory([]);

  // ── ship comms scheduler ─────────────────────────────
  useEffect(() => {
    let t;
    t = setTimeout(() => {
      pushMsg({ from: "BRIDGE", txt: "Tricorder linked. Receiving your telemetry." });
      const sched = () => {
        const d = 9000 + Math.random() * 15000;
        t = setTimeout(() => { pushMsg(generateShipMessage()); sched(); }, d);
      };
      sched();
    }, 2500);
    return () => { clearTimeout(t); clearTimeout(toastTimerRef.current); };
  }, []);

  // ── tab switcher ─────────────────────────────────────
  const changeView = (v) => {
    if (view === v) return;
    setView(v);
    if (v === "comms") setUnread(0);
    if (v !== "diag") setGame(null);
    setToast(null);
  };

  // ── scan actions ─────────────────────────────────────
  const switchMode = (m) => {
    if (scanning || m === mode) return;
    setMode(m); setSample(null); setScanLog([]);
  };

  const doScan = () => {
    if (scanning) return;
    setScanning(true); setProgress(0); setSample(null); setScanLog([]);
    const modeConfig = getMode(mode);
    const chosen = pickRandom(modeConfig.samples);
    const start = Date.now(), duration = 1800;
    let raf;
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p < 100) { raf = requestAnimationFrame(tick); }
      else {
        setSample(chosen); setScanning(false); setScanCount((c) => c + 1);
        const lines = [
          `► lock acquired`,
          `► subject     ${chosen.subject.toLowerCase()}`,
          `► class       ${chosen.spec.toLowerCase()}`,
          `► ${chosen.notes.toLowerCase()}`,
          `► risk level  ${chosen.risk}`,
        ];
        lines.forEach((l, i) => setTimeout(() => setScanLog((prev) => [...prev, l]), i * 140));
        // write to shared history log (fires cross-module reactions)
        logEntry({
          kind: "scan",
          title: chosen.subject,
          subtitle: `${mode} · ${chosen.risk} risk`,
          color: riskColor(chosen.risk),
          data: { mode, risk: chosen.risk, spec: chosen.spec },
        });
      }
    };
    raf = requestAnimationFrame(tick);
  };

  // ── status strip (contextual) ────────────────────────
  const timeStr = nowTimeFull();
  const statusLeft =
    view === "scan" ? <>MODE <span style={{ color: C.cyan }}>{mode}</span></> :
    view === "diag" ? <>MODE <span style={{ color: C.cyan }}>DIAG</span></> :
    view === "comms" ? <>MODE <span style={{ color: C.cyan }}>COMMS</span></> :
    <>MODE <span style={{ color: C.cyan }}>LOG</span></>;
  const statusCenter =
    view === "scan"  ? <>SCAN  <span style={{ color: C.text }}>#{String(scanCount).padStart(4, "0")}</span></> :
    view === "diag"  ? <>DRILL <span style={{ color: C.text }}>{game ? "ACTIVE" : "IDLE"}</span></> :
    view === "comms" ? <>MSGS  <span style={{ color: C.text }}>{String(messages.length).padStart(3, "0")}</span></> :
    <>ENTR  <span style={{ color: C.text }}>{String(history.length).padStart(3, "0")}</span></>;

  // ── active diag component (from registry) ────────────
  const ActiveDiag = game ? getDiag(game)?.Component : null;

  return (
    <div style={{
      ...mono, minHeight: "100vh",
      background: `radial-gradient(ellipse at 30% 20%, #0a1518 0%, ${C.bg} 60%, #000 100%)`,
      color: C.text, padding: 14, display: "flex", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)",
        mixBlendMode: "overlay",
      }}/>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes stream-in { from { opacity: 0; transform: translateX(-4px) } to { opacity: 1; transform: none } }
        .log-line { animation: stream-in 0.2s ease-out }
        @keyframes idle-pulse {
          0%, 100% { box-shadow: 0 0 14px ${C.cyan}33 inset, 0 0 12px ${C.cyan}22 }
          50%      { box-shadow: 0 0 22px ${C.cyan}55 inset, 0 0 18px ${C.cyan}44 }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) }
          to   { opacity: 1; transform: none }
        }
      `}</style>

      <div style={{ maxWidth: 380, width: "100%", position: "relative", zIndex: 2 }}>
        {/* device header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          borderBottom: `1px solid ${C.line}`, paddingBottom: 8, marginBottom: 10,
        }}>
          <div>
            <div style={{ ...mono, fontSize: 10, color: C.cyan, letterSpacing: "0.3em", textShadow: `0 0 6px ${C.cyan}66` }}>
              MK-VII · FIELD SCANNER
            </div>
            <div style={{ ...mono, fontSize: 8, color: C.textDim, letterSpacing: "0.25em", marginTop: 2 }}>
              S/N 4412-0037 · FW 2.7.1
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  width: 3, height: 3 + i * 2,
                  background: i < 4 ? C.cyan : C.lineBright,
                  boxShadow: i < 4 ? `0 0 3px ${C.cyan}` : "none",
                }}/>
              ))}
            </div>
            <span style={{ ...mono, fontSize: 9, color: C.green }}>
              <Dot color={C.green} />87%
            </span>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          <Tab label="SCAN"  active={view === "scan"}  onClick={() => changeView("scan")} />
          <Tab label="DIAG"  active={view === "diag"}  onClick={() => changeView("diag")} />
          <Tab label="COMMS" active={view === "comms"} onClick={() => changeView("comms")} badge={unread} />
          <Tab label="LOG"   active={view === "log"}   onClick={() => changeView("log")} />
        </div>

        {/* status strip */}
        <div style={{
          display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim,
          marginBottom: 12, letterSpacing: "0.22em", textTransform: "uppercase",
        }}>
          <span>{statusLeft}</span>
          <span>{statusCenter}</span>
          <span>{timeStr}</span>
        </div>

        {/* toast */}
        {toast && <Toast msg={toast} />}

        {/* content — SCAN */}
        {view === "scan" && (
          <>
            <div style={{
              border: `1px solid ${sample ? C.cyan : C.line}`, borderRadius: 6,
              padding: "12px 14px", background: C.panel, marginBottom: 10,
              minHeight: 72, position: "relative",
              boxShadow: sample ? `0 0 14px ${C.cyan}22 inset` : "none", transition: "all 0.3s",
            }}>
              <Label size={8}>SUBJECT</Label>
              {sample ? (
                <>
                  <div style={{ ...mono, fontSize: 18, color: C.text, marginTop: 4, textShadow: `0 0 8px ${C.cyan}44` }}>
                    {sample.subject}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: C.cyanDim, marginTop: 4, letterSpacing: "0.15em" }}>
                    {sample.spec}
                  </div>
                </>
              ) : scanning ? (
                <div style={{ ...mono, fontSize: 14, color: C.amber, marginTop: 8, animation: "blink 0.7s infinite" }}>
                  ◉ ACQUIRING TARGET…
                </div>
              ) : (
                <div style={{ ...mono, fontSize: 14, color: C.textDim, marginTop: 8 }}>
                  ◯ STANDBY — AWAITING SCAN
                </div>
              )}
              {sample && (
                <div style={{
                  position: "absolute", top: 10, right: 10, ...mono, fontSize: 9,
                  letterSpacing: "0.25em", padding: "3px 8px",
                  border: `1px solid ${riskColor(sample.risk)}`,
                  color: riskColor(sample.risk), borderRadius: 2,
                  textShadow: `0 0 4px ${riskColor(sample.risk)}66`,
                }}>{sample.risk}</div>
              )}
            </div>

            <div style={{
              border: `1px solid ${C.line}`, borderRadius: 6, padding: 8,
              background: "rgba(0,0,0,0.5)", marginBottom: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Label size={8} color={C.cyanDim}>SPECTROGRAM · {mode}</Label>
                <Label size={8} color={scanning ? C.amber : C.textDim}>
                  {scanning ? `${progress.toFixed(0)}%` : sample ? "LOCKED" : "IDLE"}
                </Label>
              </div>
              <Spectrogram modeId={mode} scanning={scanning} progress={progress} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
              {(sample ? sample.vitals : [
                ["--", "---", C.textFaint], ["--", "---", C.textFaint],
                ["--", "---", C.textFaint], ["--", "---", C.textFaint],
              ]).map((v, i) => <VitalCell key={i} k={v[0]} v={v[1]} color={v[2]} />)}
            </div>

            <div style={{
              border: `1px solid ${C.line}`, borderRadius: 6, padding: 10,
              background: "rgba(0,0,0,0.4)", minHeight: 128, marginBottom: 12,
              fontSize: 10, lineHeight: 1.8, color: C.textDim,
            }}>
              <Label size={8}>ANALYSIS STREAM</Label>
              <div style={{ marginTop: 6 }}>
                {scanLog.length === 0 && !scanning && (<div style={{ color: C.textFaint }}>► no data</div>)}
                {scanning && (
                  <div style={{ color: C.amber, animation: "blink 0.7s infinite" }}>
                    ► scanning… {progress.toFixed(0)}%
                  </div>
                )}
                {scanLog.map((line, i) => (
                  <div key={i} className="log-line" style={{
                    color: i === scanLog.length - 1 ? C.cyan : C.textDim, whiteSpace: "pre-wrap",
                  }}>{line}</div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {SCAN_MODES.map((m) => (
                <ModeBtn key={m.id} label={m.label} active={mode === m.id}
                  onClick={() => switchMode(m.id)} disabled={scanning} />
              ))}
            </div>

            <button onClick={doScan} disabled={scanning} style={{
              ...mono, width: "100%", padding: "18px", fontSize: 18, letterSpacing: "0.5em",
              border: `2px solid ${scanning ? C.amber : C.cyan}`,
              background: scanning ? `${C.amber}1a` : `${C.cyan}14`,
              color: scanning ? C.amber : C.cyan, borderRadius: 6,
              cursor: scanning ? "default" : "pointer",
              textShadow: `0 0 10px ${scanning ? C.amber : C.cyan}`,
              animation: scanning ? undefined : "idle-pulse 2.4s ease-in-out infinite",
              transition: "color 0.2s, border-color 0.2s", position: "relative", overflow: "hidden",
            }}>
              {scanning ? "◉ SCANNING" : "◉ SCAN"}
              {scanning && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, height: 3,
                  width: `${progress}%`, background: C.amber, boxShadow: `0 0 8px ${C.amber}`,
                }}/>
              )}
            </button>
          </>
        )}

        {/* content — DIAG */}
        {view === "diag" && !game && <DiagMenu onSelect={setGame} />}
        {view === "diag" && ActiveDiag && (
          <ActiveDiag onExit={() => setGame(null)} onComplete={logEntry} />
        )}

        {/* content — COMMS */}
        {view === "comms" && <CommsView messages={messages} />}

        {/* content — LOG */}
        {view === "log" && <HistoryView history={history} onClear={clearHistory} />}

        {/* footer */}
        <div style={{
          marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
          fontSize: 9, color: C.textDim, borderTop: `1px solid ${C.line}`, paddingTop: 10,
        }}>
          <div>
            <Label size={7}>COORDS</Label>
            <div style={{ color: C.text, marginTop: 2, fontSize: 10 }}>42.3°N 71.1°W</div>
          </div>
          <div>
            <Label size={7}>ENV</Label>
            <div style={{ color: C.green, marginTop: 2, fontSize: 10 }}><Dot color={C.green} /> safe</div>
          </div>
          <div>
            <Label size={7}>REC</Label>
            <div style={{ color: C.red, marginTop: 2, fontSize: 10 }}><Dot color={C.red} blink /> live</div>
          </div>
        </div>
      </div>
    </div>
  );
}
