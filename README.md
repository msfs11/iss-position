# ISS Orbit Viewer

A single-page application that visualizes the **International Space Station** flying in
its real orbit around a textured **3D Earth globe** — built for academic/educational use.

Live demo: start with `npm install && npm run dev`.

## Features

- 🌍 Textured 3D Earth (NASA Blue Marble day map, night lights, clouds, atmosphere glow)
- ☀️ Day/night terminator computed from the real Sun direction
- 🛰️ Real NASA ISS 3D model (DRACO-compressed GLB, procedural fallback if missing)
- 📡 Real orbit from **Two-Line Elements (TLE)** propagated with **SGP4** (`satellite.js`)
- 🟡/🔵 Orbit trail and ground track, color-coded by sunlight (yellow) / shadow (blue)
- ⏱ Time controls: pause, 1×–1000×, reverse, instant "Now", date/time seek
- 🎥 Camera modes: Follow ISS · Free orbit · Overview
- 🧮 Educational telemetry: coordinates, altitude, velocity, period, inclination, eccentricity, orbit #
- 👨‍🚀 Live crew count from Open Notify (when reachable)
- ♿ Keyboard shortcuts, ARIA labels, reduced-motion support

## Architecture

```
index.html                  SPA shell + splash
src/
  main.js                   entry: wiring, render loop, state
  style.css                 global UI styles
  core/
    constants.js            Earth radius, API endpoints
    TimeSim.js              simulation clock (pause, speed, reverse, seek)
  orbit/
    math.js                 ECI/ECEF/world coordinate helpers, Sun vector
    Propagator.js           SGP4 propagation + orbit sampling + orbital elements
  data/
    liveData.js             CelesTrak TLE + Open Notify / Where The ISS At + astros
  scene/
    SceneBuilder.js         renderer, camera, OrbitControls, lights, starfield
    Globe.js                Earth day/night shader, clouds, atmosphere, graticule
    ISS.js                  NASA ISS GLB (DRACO) + procedural fallback
    OrbitTrail.js           orbit path + ground track (Line2, vertex colors)
  ui/
    InfoPanel.js            real-time telemetry panel
    ControlBar.js           playback/view/toggle controls
  vendor/
    wasmStub.js             shim for satellite.js internal WASM worker imports
public/
  textures/                 Earth textures (bundled, offline-friendly)
  models/iss.glb            NASA ISS model
  draco/                    Draco decoder for the GLB
  manifest.webmanifest      PWA manifest
```

## Data sources

| Source | Use | License |
|---|---|---|
| [CelesTrak](https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle) | Live ISS TLE | free for general use |
| [Open Notify](https://api.open-notify.org) | ISS ground position + people in space | open |
| [Where The ISS At](https://wheretheiss.at) | fallback live telemetry | open |
| NASA Blue Marble / NASA 3D Resources | Earth textures & ISS model | public domain (credit NASA) |

All data is fetched with graceful offline fallbacks (bundled textures + embedded TLE).

## TLE freshness

The ISS TLE is fetched from CelesTrak at startup. If unreachable, an embedded TLE is
used (file: `src/data/liveData.js`, `FALLBACK_TLE`) — update it periodically for
long-running simulations far from today.

## Development

```bash
npm install
npm run dev      # dev server → http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview production build
```

Manual tests (require a local dev server on port 5199 and a headless Chromium):

```bash
node test/runtime.smoke.cjs     # boot + telemetry
node test/behavior.smoke.cjs    # controls/interactions
node test/render.probe.cjs      # screenshot-based render probe (analyzes PNG)
node test/preview.smoke.cjs     # production build boots cleanly (needs `vite preview` on :5200)
node test/alignment.spec.cjs    # globe texture geometry alignment (no browser needed)
node test/analyze-png.cjs /tmp/x.png  # PNG pixel analysis
```

## Deployment

Static hosting only. Any of:
- **GitHub Pages / Netlify / Cloudflare Pages**: build with `npm run build`, publish `dist/`.
- Add a CI workflow that runs `npm ci && npm run build` and uploads `dist/`.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | pause / play |
| `F` | Follow ISS view |
| `O` | Overview view |
| `E` | Free orbit view |
| `G` | toggle graticule grid |

## Academic notes

- ISS orbit: altitude ≈ 408–440 km, inclination 51.6°, period ≈ 92.9 min, ~16 orbits/day.
- The ground track's sinusoidal shape is the projection of the inclined circular orbit onto
  the rotating Earth; the sub-satellite latitude stays within ±51.6° (geodetic).
- **SGP4/SDP4** (NORAD) is the standard simplified model for near-Earth orbit propagation
  used by NASA and space agencies.
- The scene is Earth-fixed (ECEF): the globe is static and the ISS moves along its
  ground-relative path, so continents line up correctly with the ground track.
- "Velocity (ground)" subtracts the Earth's rotation from the inertial velocity
  (≈7.4 km/s surface-relative vs ≈7.7 km/s inertial).

## Credits

NASA Earth Observatory (Blue Marble), NASA 3D Resources (ISS model), CelesTrak (TLE),
Open Notify, `satellite.js`, `three.js`.