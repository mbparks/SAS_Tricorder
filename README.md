<img width="2048" height="2048" alt="sas_tricorder" src="https://github.com/user-attachments/assets/6be9be72-7b8e-415e-9dc1-edceb5ef0f3a" />

# MK-VII Field Scanner

A handheld "tricorder" simulator built as a single-page web app — designed primarily as a **prop for filmmakers** who need a believable hand-held scanner on screen, and as an ambient device for ASMR / relaxation viewing. Pure HTML/JS/CSS, no build step required, runs offline once loaded. Inspired by classic spacecraft-bridge UIs: monospace fonts, cyan-on-black, status dots, letterspaced caps, the works.

[**Live demo →**](https://mbparks.com/tri)

---

## What it does

The app simulates a field-scientist's handheld device. Six tabs across the top organize different functions:

- **SCAN** — five sensor modes (BIO, GEO, ATMO, EM, OPT). Press SCAN, the device acquires a sample, plays a tier-appropriate resolution chord, and streams analysis text. OPT mode uses your device camera and produces readings that correlate with what's in the viewfinder. EM mode shows a tilt-aware compass widget.
- **MED** — live biosignature monitor. ECG trace, respiration waveform, and eight vitals (HR, BP, SpO₂, RESP, TEMP, HRV, NEURAL, STRESS) drift in real time with subtle plausible noise. A heartbeat sound plays at the actual interval.
- **DIAG** — three diagnostic mini-games framed as instrument calibration: SIGNAL LOCK (timing), DECRYPT CIPHER (memory), SUBSPACE TUNE (frequency dial).
- **MSN** — five mission objectives that auto-complete as you use the device, plus a live away-team presence panel showing each crew member's location, bearing, and current activity.
- **COMMS** — two-way messaging. Ship and three away-team members reply contextually based on keyword analysis of your outgoing message. Ambient ship chatter arrives on a tunable cadence.
- **LOG** — full activity history with stylized field-report export, theme picker, and device re-pairing.

The header shows the ship name, operator initial, current stardate, battery %, mute toggle, and (on supported platforms) a fullscreen toggle. The footer shows live coordinates, current environment tier with interference percentage, and session elapsed time.

Wanna try a full-on starship bridge simulator? [**Click Here**](https://github.com/mbparks/StarshipSimulatorASMR)

---

## For filmmakers

This is the headline use case. The MK-VII is built to be **scriptable, controllable, and camera-ready** — drop it into a shot, point a phone camera at it, and have a working, animated, plausible-looking scientific device on screen with no production overhead.

### Why it works as a film prop

- **Always-on motion.** Even when no actor is interacting, the device is visibly alive: spectrogram waveforms drift, vitals tick, stardate counts forward, environment cycles, away-team activity log updates, battery status changes, ambient ship messages arrive on a tunable cadence. You can hold the camera on it for thirty seconds without dead frames.
- **Authoritative-looking readouts.** Greek letters, scientific notation, plausible units (pg/mL, cd/m², µSv/h, Hz, σ, ε), Star-Trek-style stardates. The numbers don't have to mean anything — they just have to read as real.
- **High-contrast, camera-friendly UI.** JetBrains Mono throughout, hairline borders, status dots with subtle glow, no bloomy whites, predictable framing. Reads cleanly on screen at any focal length.
- **Zero hardware, zero cost.** It runs on any phone with a web browser. Two minutes of setup, no app store, no installation friction, no cost to the production.

### Director controls

**URL scene presets** let you launch the device in a specific mood by passing query parameters. Hand the actor a URL via Messages or AirDrop, they tap it, the device opens already in the right state for the take.

| URL parameter | Effect |
|---|---|
| `?scene=idle` | Peaceful, all-green, comms quiet (~105s between messages) |
| `?scene=alert` | Urgent feel, busy radio chatter (~9s between messages) |
| `?scene=scanning` | Perpetual scan-in-progress feel |
| `?scene=damaged` | Glitches and partial UI failures |
| `?scene=comms` | Heavy comms traffic |
| `?subject=Medusan%20lifeform` | Every scan resolves to this subject |
| `?risk=EXTREME` | Every scan returns this risk tier |
| `?notes=Phase-shifted%20organism` | Override the analysis description |
| `?dev=1` | Open the director panel automatically |

These compose. `?scene=alert&subject=Borg%20signature&risk=EXTREME` is a fully scripted shot in one URL.

**Director panel** (long-press the stardate in the header for 700ms, or open with `?dev=1`):

- **Force next scan** — pre-set the subject, risk tier, and notes for the actor's next scan. Pick from any risk level (NONE → EXTREME). One-shot — fires once and clears, so the actor can do "uh oh" reaction beats on cue.
- **Inject custom messages** — type any message from any sender (BRIDGE, CAPTAIN, ENGINEERING, MED BAY, SCIENCE, TACTICAL, HELM). Useful for "*Sir, you should see this*" reaction beats.
- **Freeze stardate** — lock the displayed stardate to its current value forever for multi-take continuity. Re-takes match the master.

**Theme variants** (in the LOG tab) swap the entire color palette so you can match a scene's lighting:

- **Bridge Tactical** — cyan/amber on near-black (default, the most "Star Trek" look)
- **Medical Bay** — mint green on near-black, warmer
- **Engineering** — amber/brass on near-black, hot environment feel
- **Stealth** — dimmed everything, low contrast, for night shoots and dim sets

Theme persists across reloads, so once you've matched lighting, it stays.

**Camera scan mode (OPT)** — when in OPT scan mode, the device shows a live camera viewfinder with cyan corner brackets, crosshair, and a sweep line during scan. The actor literally points the phone at the prop or set piece, presses SCAN, and gets a contextually-plausible reading: the analysis result correlates with the visual content of the frame. Wood/plant → bio readings. Metal/rock → mineral readings. Sky → atmospheric haze. Same scene gives consistent readings, so multi-take continuity is preserved.

**Live geolocation** in the footer — once permission is granted, real coordinates display in degree format (`39.64°N 77.72°W`). Tap to retry on permission errors.

**Real local weather as environment** — when geolocation works, the app pulls OpenMeteo data and translates real-world weather into in-universe atmospheric conditions: rain → PARTICULATE, storms → ION STORM, clear sky → CLEAR. The device is "reading the world" the actor is in.

**Fullscreen mode** for desktop/Android, plus **add-to-home-screen PWA install** for iOS, both produce a chromeless launch — no URL bar, no browser UI. Tap the icon, get a full-bleed device, no chrome at all.

### Setting up a film prop session

1. Open `mbparks.com/tri/` in mobile Safari (iOS) or Chrome (Android)
2. Pair the device — enter operator first/last name and ship name (one-time, persists)
3. **iOS**: Share button → Add to Home Screen → tap the icon to launch fullscreen
4. **Android**: Chrome menu → Install → tap the home-screen icon
5. For specific shot setup, either pass URL parameters or long-press the stardate to open the director panel
6. Roll the camera

The device renders the same on every modern phone — no per-device tuning needed.

---

## For ASMR / ambient viewing

The MK-VII is also designed as something you can leave running in the background or watch passively. Beyond the visual motion described above, it has:

- **Layered synthesized audio** — every sound is generated at runtime via Web Audio (no audio files). Soft chord chimes, subtle ticks, sweep tones, simulated heartbeat, frequency lock confirmations.
- **Risk-tier resolution sounds** — different chord progressions for clean / caution / warning / alarm scan completions. Audible variety even when watching passively.
- **Slowly-cycling environment** — atmospheric conditions drift through five tiers every few minutes, status updates reflect the change without any user input.
- **Drifting away-team activities** — Vance, Imani, and Kato have positions and current activities that update slowly, visible on the MSN tab. Distance and bearing drift over time; activities cycle on 90-180s intervals.
- **Ambient ship comms** — random in-character messages arrive at tunable rates, each with a sender (BRIDGE / CAPTAIN / etc.) and contextually plausible content.
- **Heartbeat sound at MED tab** — synced to the operator's simulated heart rate, audibly steady.
- **Mute toggle in header** — instant silence when needed.

---

## Setup

```bash
git clone https://github.com/[your-username]/[your-repo].git
cd [your-repo]
# open index.html in any modern browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

There is no build step, no package manager, no `node_modules`. The single `index.html` file is fully self-contained: React 18, ReactDOM, and the entire app are inlined. Drop it on any web server and it just works.

Some features require HTTPS or `localhost`:

- **Camera (OPT mode)** — requires HTTPS or localhost
- **Geolocation** (real coordinates in footer) — requires HTTPS or localhost
- **Compass / device orientation** (EM mode) — requires HTTPS, plus an iOS permission tap
- **Clipboard** (field-report export) — requires HTTPS in some browsers

For local development, `python3 -m http.server` on `localhost` exempts you from the HTTPS requirement.

---

## Browser support

Tested on:

- Chrome / Edge / Brave (desktop + Android)
- Safari (macOS + iOS 14+)
- Firefox (desktop + Android only — **Firefox iOS is unsupported**)

iOS-specific notes:

- Camera and microphone permissions prompt once per session unless the site is marked "always allow"
- Audio is silent until the user's first tap (browser autoplay policy)
- Vibration is unsupported on iOS regardless of API claims
- Compass requires explicit permission tap (the EM scan view shows a "TAP TO ENABLE COMPASS" button)
- Fullscreen API doesn't work on iOS Safari — use Add to Home Screen for chromeless launch
- Battery Status API is removed from Safari for privacy — the simulated battery percentage is what's shown

Desktop without a webcam: OPT mode shows "NO OPTICAL SENSOR DETECTED" and remains usable; the other four scan modes work normally.

---

## Architecture

The app is structured around **registries** — arrays of declarative configuration objects. Each registry defines an extension point. To add a feature, you add an entry; the rest of the system picks it up automatically.

| Registry | What it defines | How to extend |
|---|---|---|
| `THEMES` | Color palettes (tactical/medical/engineering/stealth) | Add a palette object with `bg/cyan/amber/red/green/text/...` |
| `SCAN_MODES` | Sensor modes (BIO/GEO/ATMO/EM/OPT) | Push `{ id, label, samples, generatePoints, usesCamera?, usesCompass? }` |
| `DIAGS` | Diagnostic mini-games | Push `{ id, name, desc, icon, Component }` |
| `MISSIONS` | Objectives that auto-progress on log events | Push `{ id, title, brief, target_kind, target_count, reward_msg }` |
| `MESSAGE_SOURCES` | Ship comm senders (weighted message pool) | Add a key with `{ weight, messages: [...] }` |
| `AWAY_TEAM` | Field personnel for two-way comms | Push `{ id, name, role, replies: { keyword: [...] } }` |
| `PRESENCE_ACTIVITIES` | Activity strings each crew member cycles through | Add an array under the member's id key |
| `SOUNDS` | Web Audio synthesis recipes | Add a key with `{ kind: "blip"\|"chord"\|"sweep", ... }` |
| `BOOT_SCRIPT` | Boot-sequence event timeline | Add `{ at, kind, text?, sound? }` events to the array |
| `BATTERY_COSTS` | Per-action battery drain | Add a key with a percentage value |
| `ENV_CONDITIONS` | Atmospheric conditions cycle | Push `{ id, label, color, interference }` |
| `SCENES` | URL-driven preset visual states | Add `{ id: { label, desc } }` |
| `REACTIONS` | Cross-module event responders | Push `{ id, match(entry, ctx), respond(entry, ctx), delay?, chance? }` |
| `EFFECT_HANDLERS` | Side-effect dispatchers | Add a key mapping effect type to a function |

**Event flow.** Every meaningful action (scan completion, drill completion, medical assessment) calls `logEntry(entry)`. That writes to history, persists to storage, then iterates `REACTIONS` — any matching reaction produces declarative `Effect` objects which `EFFECT_HANDLERS` dispatch as side effects. Mission progress is checked the same way. So a single function call ripples out into history updates, ship messages, mission completions, audio, and any future side-effect type — without any hardcoded knowledge in the action sites.

This means **most new features are isolated edits to a single registry**:

- New mission → one object in `MISSIONS`
- New ship sender → one entry in `MESSAGE_SOURCES`
- New mini-game → one component plus one entry in `DIAGS`
- New theme → one palette object in `THEMES`
- New scene preset → one entry in `SCENES`
- New crew activity → one string in `PRESENCE_ACTIVITIES`
- New cross-module reaction (e.g. "if stress > 70%, captain pings") → one reaction object in `REACTIONS`

### Persistence

The app uses `window.storage` (with a `localStorage` polyfill) to persist:

| Key | Contents |
|---|---|
| `profile` | Operator name + ship name from onboarding |
| `history` | All logged activity (capped at 100 entries) |
| `missions` | Mission progress counters |
| `missions_done` | Completed mission IDs |
| `battery` | Current battery percentage |
| `muted` | Audio mute preference |
| `theme` | Selected theme id |

Clearing browser site data resets everything to first-launch state.

---

## Project structure

```
tricorder.jsx     development source — single-file React component (~4600 lines)
index.html        production output — pre-transpiled, fully inlined, deployable as-is
README.md         this file
```

`tricorder.jsx` is the canonical source. `index.html` is generated from it by transpiling the JSX to plain JS via esbuild (targeting ES2017 for older WebKit support) and inlining React, ReactDOM, and a `localStorage`-based persistence shim.

```bash
# rough recipe — adapt to your environment
sed -e '/^import React/d' -e 's/^export default function Tricorder/function Tricorder/' tricorder.jsx \
  | npx --yes esbuild --loader=jsx --jsx=transform --target=es2017 \
  > /tmp/transpiled.js
# then assemble HTML wrapper around /tmp/transpiled.js + react/react-dom UMD bundles
```

Production bundle: ~330KB total (most of which is React + ReactDOM). No external assets — every sound, icon, and graphic is generated at runtime.

---

## Stack

- **React 18** for component model
- **Web Audio API** for synthesized sound
- **getUserMedia** for camera (OPT mode)
- **Geolocation API** for footer coordinates
- **DeviceOrientationEvent** for compass widget (EM mode)
- **OpenMeteo API** for live weather → environment mapping
- **Clipboard API** + **Web Share API** for field-report export
- **localStorage** for persistence (via the `window.storage` shim)
- **PWA manifest tags** for iOS / Android home-screen install
- **esbuild** to pre-transpile JSX for the production bundle (no other build tooling required for development)

---

## Origin

This project started as a thirty-second sketch — "build me a UI that feels like the cockpit of a spaceship." It accreted features one conversation at a time: started as a bridge dashboard, got rebuilt as a handheld scanner, gained mini-games, then ship comms, then medical, then onboarding, then camera scans, then missions, then field-report export, then themes, then a director panel, then a few dozen smaller refinements. Most of those features were drafted, critiqued, refactored, and shipped in single sessions. The whole thing was built collaboratively with [Claude](https://claude.ai). The architecture (the registries, the reaction system, the effect dispatcher) emerged organically from "make this easier to extend" prompts about three or four iterations in.

---

## License

MIT — do whatever you want with it.

If you use it in a film, short, music video, or any other production, I'd love to see it. Tag the repo or email me — I genuinely just want to know.

---

## Contributing

PRs and issues welcome. The architecture makes new features cheap to add — see the registry table above. If you build something cool, send a PR. If you customize for your own production, fork freely.
