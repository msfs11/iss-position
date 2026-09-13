import * as THREE from 'three';
import * as satellite from 'satellite.js';

import { SceneBuilder } from './scene/SceneBuilder.js';
import { Globe } from './scene/Globe.js';
import { ISS } from './scene/ISS.js';
import { OrbitTrail } from './scene/OrbitTrail.js';
import { Propagator, currentSunDirection } from './orbit/Propagator.js';
import { TimeSim, formatSimTime } from './core/TimeSim.js';
import { fetchTle, fetchLivePosition, fetchAstros, FALLBACK_TLE } from './data/liveData.js';
import { InfoPanel } from './ui/InfoPanel.js';
import { ControlBar } from './ui/ControlBar.js';

import './style.css';

const appState = {
  speed: 1,
  paused: false,
  view: 'free',
  showOrbit: true,
  showGround: true,
  showGrid: false,
  autoLight: true,
  lastSeekAt: 0,
};

let helpModal = null;

const app = document.getElementById('app');
const splash = document.getElementById('splash');
const loadingMsg = document.getElementById('loading-msg');

function setLoading(msg) {
  if (loadingMsg) loadingMsg.textContent = msg;
}
function hideSplash() {
  splash.classList.add('hidden');
  setTimeout(() => splash.remove(), 700);
}

function loadTextures() {
  const loader = new THREE.TextureLoader();
  const map = (url) =>
    new Promise((resolve) => {
      loader.load(url, (t) => resolve(t), undefined, () => resolve(null));
    });
  return Promise.all([map('textures/earth_day.jpg'), map('textures/earth_night.png'), map('textures/earth_clouds.png')]).then(
    ([day, night, clouds]) => {
      if (day) day.colorSpace = THREE.SRGBColorSpace;
      if (night) night.colorSpace = THREE.SRGBColorSpace;
      return { day, night, clouds };
    },
  );
}

async function init() {
  setLoading('Building 3D scene…');
  const builder = new SceneBuilder(app);

  setLoading('Loading Earth and ISS data…');
  const [tleResult, textures] = await Promise.all([fetchTle(), loadTextures()]);
  const tle = tleResult.tle ?? FALLBACK_TLE;
  let satrec;
  try {
    satrec = satellite.twoline2satrec(tle[1], tle[2]);
  } catch (err) {
    console.warn('Bad TLE, using fallback', err);
    satrec = satellite.twoline2satrec(FALLBACK_TLE[1], FALLBACK_TLE[2]);
  }
  const propagator = new Propagator(satrec);
  const elements = propagator.orbitalElements();
  const epochMs = satrec.jdsatepoch
    ? new Date((satrec.jdsatepoch - 2440587.5) * 86400000).getTime()
    : Date.now();

  const globe = new Globe(builder.scene, textures);
  const rollMatch = /[?&]roll=(-?\d+)/.exec(window.location.search);
  if (rollMatch) globe.setTextureRoll(Number(rollMatch[1]));
  globe.setGraticuleVisible(appState.showGrid);
  const iss = new ISS(builder.scene);
  const trail = new OrbitTrail(builder.scene, propagator, builder.renderer);
  trail.setShowOrbit(appState.showOrbit);
  trail.setShowGround(appState.showGround);

  const sim = new TimeSim(new Date(), appState.speed);
  const infoPanel = new InfoPanel(app);
  const controlBar = new ControlBar(app, appState, {
    onSpeed: (s) => {
      sim.setSpeed(s);
      controlBar.setSpeed(s);
    },
    onPause: () => {
      const p = sim.togglePause();
      appState.paused = p;
      controlBar.setPaused(p);
    },
    onReverse: () => {
      appState.speed = -appState.speed === 0 ? 1 : -appState.speed;
      sim.setSpeed(appState.speed);
      controlBar.setSpeed(appState.speed);
      controlBar.setPaused(false);
    },
    onView: (v) => {
      appState.view = v;
      controlBar.setView(v);
      if (v === 'overview') builder.controls.target.copy(new THREE.Vector3(0, 0, 0));
    },
    onSeek: (iso) => {
      sim.seek(iso ? new Date(iso) : new Date());
      appState.lastSeekAt = Date.now();
      if (!iso) sim.setSpeed(appState.speed); // "Now" resumes at current speed
    },
    onToggle: (key, val) => {
      appState[key] = val;
      if (key === 'showOrbit') trail.setShowOrbit(val);
      if (key === 'showGround') trail.setShowGround(val);
      if (key === 'showGrid') globe.setGraticuleVisible(val);
    },
    onHelp: () => showHelp(),
  });

  buildHelpModal(app);
  bindKeyboard();
  builder.setResizeHandler((w, h) => trail.setResolution(w, h));

  // Periodic live-data refresh: soft clock sync + crew count + live position.
  const syncNow = () => {
    if (appState.speed === 1 && !appState.paused) {
      // Give a manual seek a grace period so the clock is not yanked back
      // to wall time right away.
      if (Date.now() - appState.lastSeekAt < 60000) return;
      const drift = Math.abs(Date.now() - sim.simTime.getTime());
      if (drift > 20000) sim.clampToNow();
    }
  };
  const refreshLive = () => {
    fetchLivePosition().then((live) => {
      if (!live) return;
      const v =
        live.altKm != null
          ? `${live.lat.toFixed(1)}°, ${live.lon.toFixed(1)}° · alt ${Math.round(live.altKm)} km · src ${live.source}`
          : `${live.lat.toFixed(1)}°, ${live.lon.toFixed(1)}° · src ${live.source}`;
      infoPanel.set('live', v);
    });
  };
  refreshLive();
  setInterval(() => {
    syncNow();
    refreshLive();
  }, 60000);
  fetchAstros().then((a) => {
    if (a) infoPanel.set('crew', `${a.count} people in orbit`);
  });

  builder.controls.maxDistance = 12;

  // ---- render loop
  const frame = (now) => {
    requestAnimationFrame(frame);
    sim.tick(now);
    const simDate = sim.simTime;

    const sunDir = currentSunDirection(simDate);
    globe.setSunDirection(sunDir);
    builder.updateSunDirection(sunDir);

    const state = propagator.stateAt(simDate);
    let lit = true;
    if (state) {
      const radialUp = state.worldPos.clone().normalize();
      lit = radialUp.dot(sunDir) > 0.0;
      iss.update(state.worldPos, state.velDir, radialUp);
      trail.updateSubsatellite(state.worldPos);
      iss.setLit(lit);

      const telemetry = {
        geodetic: state.geodetic,
        lit,
        velKmh: state.groundSpeed * 3600,
        periodMin: elements.periodMin,
        inclination: elements.inclination,
        eccentricity: elements.eccentricity,
        orbitsCompleted:
          ((simDate.getTime() - epochMs) / 60000 / elements.periodMin).toFixed(0),
      };
      infoPanel.update(telemetry);
    }

    trail.recompute(simDate, sunDir);
    updateCamera(state);
    controlBar.setClock(formatSimTime(simDate));
    builder.controls.update();
    clampCameraOutsideEarth();
    builder.renderer.render(builder.scene, builder.camera);
  };

  function clampCameraOutsideEarth() {
    // Never let wheel-zoom (any view) push the camera through the planet.
    const minR = 1.02;
    if (builder.camera.position.length() < minR) {
      builder.camera.position.setLength(minR);
    }
  }

  function updateCamera(state) {
    if (!state) return;
    if (appState.view === 'follow') {
      const radial = builder.camera.position.clone().sub(state.worldPos).normalize();
      const desired = state.worldPos
        .clone()
        .addScaledVector(state.velDir, -0.085)
        .addScaledVector(radial, 0.02);
      builder.camera.position.lerp(desired, 0.18);
      builder.controls.target.lerp(state.worldPos, 0.35);
      builder.controls.update();
    } else if (appState.view === 'overview') {
      const desired = new THREE.Vector3(0.6, 2.0, 3.4);
      builder.camera.position.lerp(desired, 0.02);
      builder.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.4);
      builder.controls.update();
    }
  }

  requestAnimationFrame((t) => {
    // first tick baseline
    frame(t);
  });
}

function bindKeyboard() {
  window.addEventListener(
    'keydown',
    (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      if (e.key === 'Escape') {
        if (helpModal) helpModal.style.display = 'none';
      } else if (e.code === 'Space') {
        e.preventDefault();
        const bar = document.querySelector('.controls');
        if (bar) bar.querySelector('.pause-btn').click();
      } else if (e.key === 'f' || e.key === 'F') {
        document.querySelector('.view-btn[data-view="follow"]').click();
      } else if (e.key === 'o' || e.key === 'O') {
        document.querySelector('.view-btn[data-view="overview"]').click();
      } else if (e.key === 'e' || e.key === 'E') {
        document.querySelector('.view-btn[data-view="free"]').click();
      } else if (e.key === 'g' || e.key === 'G') {
        const d = document.querySelector('[data-toggle="showGrid"]');
        d.checked = !d.checked;
        d.dispatchEvent(new Event('change'));
      }
    },
    false,
  );
}

function buildHelpModal(app) {
  const modal = document.createElement('div');
  modal.className = 'help-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="help-card" role="dialog" aria-modal="true" aria-label="About this visualization">
      <h2>About this simulation</h2>
      <p>This academic visualization shows the actual orbit of the <strong>International Space Station</strong>
      above a textured 3D Earth globe. The orbit is computed in real time from NASA/CelesTrak
      <strong>Two‑Line Elements (TLE)</strong> using the SGP4/SDP4 orbital model
      (<code>satellite.js</code>).</p>
      <ul>
        <li>The ISS flies at ≈ <strong>51.6° inclination</strong> and altitude ≈ <strong>408 km</strong>, completing one orbit every ≈ <strong>92.9 min</strong>.</li>
        <li><strong>Yellow</strong> trail = path in sunlight; <strong>blue</strong> = in Earth's shadow.</li>
        <li><strong>Ground track</strong> shows the sub‑satellite point on the surface; it never exceeds ±51.6° latitude.</li>
        <li>A <strong>terminator</strong> separates day and night on the globe (lighted from the Sun's true direction).</li>
      </ul>
      <p style="margin-top:10px">Drag to rotate · wheel/scroll to zoom · <kbd>Space</kbd> pause ·
      <kbd>F</kbd> follow ISS · <kbd>O</kbd> overview · <kbd>G</kbd> grid · <kbd>Esc</kbd> close.</p>
      <button class="chip primary help-close">Got it</button>
    </div>
  `;
  const close = () => {
    modal.style.display = 'none';
  };
  modal.querySelector('.help-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  helpModal = modal;
  app.appendChild(modal);
}

function showHelp() {
  if (!helpModal) return;
  helpModal.style.display = 'flex';
  const btn = helpModal.querySelector('.help-close');
  if (btn) btn.focus();
}

init()
  .then(hideSplash)
  .catch((err) => {
    console.error(err);
    setLoading('Failed to initialise: ' + err.message);
  });