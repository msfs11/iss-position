# ISS Orbital Visualization SPA — Implementation Plan

## Project Overview
Single-page application showing the International Space Station orbiting a 3D Earth
globe for academic/educational purposes.

## Confirmed Technical Decisions (Recommendation)

| Decision | Selection |
|----------|-----------|
| Framework | **Vanilla JavaScript + Vite** (lighter, simpler for SPA) |
| ISS Model | **NASA GLTF** (~2MB, realistic, academic value) |
| Orbit Source | **SGP4 + API sync** (best accuracy) |
| Earth Textures | **Bundled** (reliable for academic / offline use) |
| Browser Target | **Modern only** (ES2022, WebGL2) |

## Technology Stack
- Frontend: Vanilla JavaScript (ES6 modules) + Vite
- 3D Engine: Three.js (module build)
- Orbital Mechanics: satellite.js (SGP4 propagation from TLE)
- ISS Position API: Open Notify (`https://api.open-notify.org/iss-now.json`)
  + Where The ISS At (`https://api.wheretheiss.at/v1/satellites/25544`) telemetry
- TLE source: CelesTrak `https://celestrak.org/NORAD/elements/stations.txt`
- Earth textures: NASA Blue Marble / Natural Earth III (public domain), bundled locally
- ISS model: NASA 3D Resources GLTF, bundled locally
- Build tool: Vite
- Deployment: Static hosting (GitHub Pages / Netlify / Cloudflare Pages)

---

## Milestones

### 1. Project Setup & Core Infrastructure
   Сделаем: initialize Vite project with ES modules, install three, satellite.js;
   propose a module structure for scene, camera, controls, ISS model, globe, data.
   Проверим: dev server runs, Three.js scene renders a basic test object, build passes.
   Итог: working project scaffold with build pipeline.

### 2. 3D Earth Globe with Realistic Textures
   Сделаем: earth sphere with bundled day texture, night lights, translucent cloud
   layer, atmosphere glow; day/night terminator from sun position.
   Проверим: globe shows continents, clouds, atmosphere, correct day/night shading.
   Итог: realistic 3D Earth globe.

### 3. ISS Model & Orbital Mechanics
   Сделаем: load NASA GLTF ISS model (bundled, with fallback procedural placeholder);
   SGP4 propagation via satellite.js from CelesTrak ISS TLE; position, velocity,
   orbital elements; correct altitude ~408 km, inclination 51.6°, period ~92 min.
   Проверим: ISS renders and orbits correctly; position matches live API tolerance.
   Итог: functional ISS orbital simulation.

### 4. Real-time Data Integration & Synchronization
   Сделаем: fetch Open Notify ISS position, fallback to Where The ISS At; smooth
   interpolation between updates; sync SGP4 with live data.
   Проверим: position updates smoothly; telemetry updates; auto-refresh works.
   Итог: live data integration.

### 5. Orbital Path Visualization (Ground Track)
   Сделаем: orbital trail past/future (1 / 3 orbits / 1 day); line rendered in 3D;
   color-coded day/night segments; respects 51.6° latitude limits.
   Проверим: path renders, sinusoidal patten, updates live.
   Итог: orbital path visualization.

### 6. Educational Information Panel
   Сделаем: collapsible panel with coordinates, altitude, velocity, orbital period,
   inclination, next pass (nearest location), crew count, day/night status.
   Проверим: accurate live telemetry, responsive, accessible.
   Итог: educational telemetry panel.

### 7. Camera Controls & View Modes
   Сделаем: OrbitControls; modes: Follow ISS, Earth Centered, Ground Track;
   smooth transitions, touch support.
   Проверим: all modes work, transitions smooth, controls responsive.
   Итог: camera control system.

### 8. Time Control & Simulation Features
   Сделаем: real-time / 10x / 100x / 1000x / pause / reverse; date-time picker;
   speed indicator.
   Проверим: propagation + earth rotation respond to time controls.
   Итог: time simulation controls.

### 9. Polish, Performance & Accessibility
   Сделаем: optimize render loop, culling, LOD; loading screen; error states;
   keyboard nav, reduced-motion; PWA manifest; compressed assets.
   Проверим: 60fps target, Lighthouse >90, accessible (WCAG AA).
   Итог: production-ready polished app.

### 10. Documentation & Deployment
   Сделаем: README (architecture, APIs, TLE update, deploy); CI auto-deploy;
   manifest/sitemap.
   Проверим: deployed URL live, docs complete, auto-deploy on push.
   Итог: deployed application with documentation.

---

## Academic Features Checklist
- Orbital elements (semi-major axis, eccentricity, inclination, RAAN, arg of perigee, mean anomaly)
- Ground track explanation (sinusoidal shape, ±51.6° limit)
- Day/night terminator visualization
- Solar illumination on ISS model
- Scale reference (Earth radius vs ISS altitude)
- Multi-view: 3D globe; optional 2D Mercator / equirectangular projection
- Pause/time-control for teaching orbital mechanics