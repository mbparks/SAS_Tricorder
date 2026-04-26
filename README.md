# MK-VII Field Scanner

A handheld "tricorder" simulator built as a single-page web app. Pure HTML/JS/CSS, no build step required — just open `index.html` in a browser. Inspired by classic spacecraft-bridge UIs: monospace fonts, cyan-on-black, status dots, letterspaced caps, the works.

Live demo: [your URL here]

![screenshot placeholder — drop a screenshot of the device here]

## What it does

The app simulates a field-scientist's handheld device. Six tabs across the top organize different functions:

- **SCAN** — five sensor modes (BIO, GEO, ATMO, EM, OPT). Press SCAN, and the device acquires a sample, plays a tier-appropriate resolution chord, and streams analysis text. The OPT mode uses your device camera and produces readings that correlate with what's actually in the viewfinder.
- **MED** — live biosignature monitor. ECG trace, respiration waveform, and eight vitals (HR, BP, SpO₂, RESP, TEMP, HRV, NEURAL, STRESS) drift in real time with subtle plausible noise. A heartbeat sound plays at the actual interval.
- **DIAG** — three diagnostic mini-games framed as instrument calibration: SIGNAL LOCK (timing), DECRYPT CIPHER (memory), SUBSPACE TUNE (frequency dial).
- **MSN** — five mission objectives that auto-complete as you use the device. Crew radios congratulations on completion.
- **COMMS** — two-way messaging. Ship and three away-team members reply contextually based on keyword analysis of your outgoing message. Ambient ship chatter arrives every 9–24 seconds.
- **LOG** — full activity history with stylized field-report export, plus device re-pairing.

The UI also persistently shows: ship name, operator name, battery level, signal bars, mute toggle, environment status, GPS coordinates, and away-mission timer.

## Features worth highlighting

**Custom-built**, no asset files anywhere:

- **All audio is synthesized** via the Web Audio API at runtime. Different oscillators, envelopes, lowpass filters, and feedback delay for echo. No `.mp3` or `.wav` files in the project.
- **All graphics are inline SVG/CSS**. No images, no icon fonts.
- **All UI text is in-character.** Error states, permission prompts, low-power warnings — everything reads as if it's coming from the device itself.

**Realistic interactions:**

- **Camera-driven OPT scans.** When you scan in OPT mode, the app grabs a 32×32 sample of the current video frame, computes per-channel pixel statistics, and uses a decision tree to pick a contextually-plausible reading. Point at a houseplant → bio readings. Point at your laptop → manufactured-object readings. Point at the sky → atmospheric haze. Same scene gives consistent readings.
- **Battery actually drains.** Each action has a tuned cost (scans 2%, comms 0.6%, etc.). Below 20%, Engineering pings you. Below 5%, the scanner locks out. Long-press the battery indicator to "dock" and recharge.
- **Live geolocation** in the footer (with permission), real wall-clock time, real session timer.
- **Cycling environment** — drifts between CLEAR / PARTICULATE / IONIZED / EM INTERFERENCE / ION STORM every few minutes. Visible in the footer and as a banner on SCAN with interference-percentage readout.

**A modular architecture** that makes new features cheap to add. See [Architecture](#architecture) below.

## Quick start

```bash
git clone https://github.com/[your-username]/[your-repo].git
cd [your-repo]
# open index.html in any modern browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

That's the whole install. There is no build step, no package manager, no node_modules. The single `index.html` file is fully self-contained: React 18, ReactDOM, and the entire app are inlined. It works offline and behind any CSP.

To host it: drop `index.html` on any web server. Some features require HTTPS:

- **Camera (OPT mode)** — requires HTTPS or localhost
- **Geolocation (real coordinates in footer)** — requires HTTPS or localhost
- **Clipboard (field report export)** — requires HTTPS in some browsers

For local dev, `python3 -m http.server` works fine since localhost is exempt from the HTTPS requirement.

## Browser support

Tested on:
- Chrome / Edge / Brave (desktop + Android)
- Safari (macOS + iOS 14+)
- Firefox (desktop + Android)

iOS quirks worth knowing:
- iOS Safari prompts for camera permission once per session unless the site is marked "always allow" in Settings
- Audio is silent until the user's first tap (browser policy)
- Vibration is unsupported on iOS regardless of API presence

Desktop without a webcam: OPT mode shows "NO OPTICAL SENSOR DETECTED" and remains usable; the other four scan modes work normally.

## Project structure

```
tricorder.jsx     development source — single-file React component (~3300 lines)
index.html        production output — pre-transpiled, fully inlined, deployable as-is
README.md         this file
```

`tricorder.jsx` is the canonical source. `index.html` is generated from it by transpiling the JSX to plain JS (via esbuild) and inlining React, ReactDOM, and a `localStorage`-based persistence shim. To regenerate `index.html` after editing the JSX:

```bash
# rough recipe — adapt to your environment
sed -e '/^import React/d' -e 's/^export default function Tricorder/function Tricorder/' tricorder.jsx \
  | npx --yes esbuild --loader=jsx --jsx=transform --target=es2020 \
  > /tmp/transpiled.js
# then assemble HTML wrapper around /tmp/transpiled.js + react/react-dom UMD bundles
```

(I run this through a small bash script — happy to add it to the repo if it'd help.)

## Architecture

The app is structured around **registries** — arrays of declarative configuration objects. Each registry defines an extension point. To add a feature, you add an entry; the rest of the system picks it up automatically.

| Registry | What it defines | How to extend |
|---|---|---|
| `SCAN_MODES` | Sensor modes (BIO/GEO/ATMO/EM/OPT) | Push `{ id, label, samples, generatePoints, usesCamera? }` |
| `DIAGS` | Diagnostic mini-games | Push `{ id, name, desc, icon, Component }` |
| `MISSIONS` | Objectives | Push `{ id, title, brief, target_kind, target_count, reward_msg }` |
| `MESSAGE_SOURCES` | Ship comm channels | Add a key with `{ weight, messages: [...] }` |
| `AWAY_TEAM` | Field personnel for two-way comms | Push `{ id, name, role, replies: { keyword: [...] } }` |
| `SOUNDS` | Audio cues | Add a key with `{ kind: "blip"\|"chord"\|"sweep", ... }` |
| `REACTIONS` | Cross-module event responders | Push `{ id, match(entry, ctx), respond(entry, ctx), delay?, chance? }` |
| `EFFECT_HANDLERS` | Side-effect dispatchers | Add a key mapping effect type to a function |
| `ENV_CONDITIONS` | Atmospheric conditions cycle | Push `{ id, label, color, interference }` |
| `BATTERY_COSTS` | Per-action battery drain | Add a key with a percentage value |

**Event flow.** Every meaningful action (scan completion, drill completion, medical assessment) calls `logEntry(entry)`. That function writes to history, persists to storage, then iterates `REACTIONS` — any matching reaction produces declarative `Effect` objects which `EFFECT_HANDLERS` dispatch as side effects. Mission progress is checked the same way. So a single function call ripples out into history updates, ship messages, mission completions, and any future side-effect type — without any hardcoded knowledge in the action sites.

This means **most new features are isolated edits to a single registry**. Adding a new mission is one object. Adding a new ship sender is one key. Adding a new mini-game is one component plus one registry entry. Adding a new reaction (e.g., "if the operator's stress crosses 70%, the captain pings them") is one reaction object — no changes anywhere else.

## Persistence

The app uses `window.storage` (with a `localStorage` polyfill) to persist:

| Key | Contents |
|---|---|
| `profile` | Operator name + ship name from onboarding |
| `history` | All logged activity (capped at 100 entries) |
| `missions` | Mission progress counters |
| `missions_done` | Completed mission IDs |
| `battery` | Current battery percentage |
| `muted` | Audio mute preference |

Clearing browser site data resets everything to first-launch state.

## Stack

- **React 18** for component model
- **Web Audio API** for synthesized sound
- **getUserMedia** for camera (OPT mode)
- **Geolocation API** for footer coordinates
- **Clipboard API** for field-report export
- **localStorage** for persistence (via the `window.storage` shim)
- No build tooling required for development; **esbuild** used only to pre-transpile JSX for the production bundle
- No external assets — everything is generated at runtime

Total source: ~3300 lines of JSX. Production bundle: ~270KB (most of which is React + ReactDOM).

## Origin

This project started as a thirty-second sketch — "build me a UI that feels like the cockpit of a spaceship." It accreted features one conversation at a time: started as a bridge dashboard, got rebuilt as a handheld scanner, gained mini-games, then ship comms, then medical, then onboarding, then camera scans, then missions, then field-report export, then a few dozen smaller refinements. Most of those features were drafted, critiqued, refactored, and shipped in single sessions. The whole thing was built collaboratively with [Claude](https://claude.ai). The architecture (the registries, the reaction system, the effect dispatcher) emerged organically from "make this easier to extend" prompts about three or four iterations in.

## License

MIT — do whatever you want with it.

## Contributing

This is mostly a personal project, but PRs and issues are welcome. The architecture makes it cheap to:

- Add new sensor modes (one entry in `SCAN_MODES`)
- Add new mini-games (one component + one entry in `DIAGS`)
- Add new ship characters (one entry in `MESSAGE_SOURCES` or `AWAY_TEAM`)
- Add new missions (one entry in `MISSIONS`)
- Add new sound effects (one entry in `SOUNDS`)
- Add new reactive behaviors (one entry in `REACTIONS`)

If you build something cool, send a PR.
