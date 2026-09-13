import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';

const COLOR_DAY = new THREE.Color(0xffd87a);
const COLOR_NIGHT = new THREE.Color(0x6fa8ff);

export class OrbitTrail {
  constructor(scene, propagator, renderer) {
    this.propagator = propagator;
    this.renderer = renderer;
    this.scene = scene;
    this.group = new THREE.Group();
    this.showOrbit = true;
    this.showGround = true;
    this.lastBuild = -1;
    this.rebuildEveryMs = 45 * 1000;

    this.orbit = this._makeLine(1.6, 0.42);
    this.ground = this._makeLine(2.2, 0.85);
    this.group.add(this.orbit, this.ground);

    this.subdot = new THREE.Mesh(
      new THREE.SphereGeometry(0.006, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffbe5c, depthWrite: false }),
    );
    this.group.add(this.subdot);

    scene.add(this.group);
  }

  _makeLine(linewidth, opacity) {
    const mat = new LineMaterial({
      color: 0xffffff,
      linewidth,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    const ln = new Line2(new LineGeometry(), mat);
    ln.visible = true;
    return ln;
  }

  setResolution(w, h) {
    this.orbit.material.resolution.set(w, h);
    this.ground.material.resolution.set(w, h);
  }

  setShowOrbit(v) {
    this.showOrbit = v;
    this.orbit.visible = v;
  }

  setShowGround(v) {
    this.showGround = v;
    this.ground.visible = v;
  }

  recompute(simTime, sunDir) {
    if (!this.propagator) return;
    const t = simTime.getTime();
    if (Math.abs(t - this.lastBuild) < this.rebuildEveryMs) {
      this._updateSubdot();
      return;
    }
    this.lastBuild = t;

    const PAST_PTS = 190;
    const PAST_STEP = 60 * 1000;
    const FUT_PTS = 256;
    const FUT_STEP = 75 * 1000;

    const past = this.propagator.sampleOrbit(simTime, PAST_PTS, -PAST_STEP);
    const future = this.propagator.sampleOrbit(simTime, 1, FUT_STEP).concat(
      this.propagator.sampleOrbit(new Date(t + FUT_STEP), FUT_PTS - 1, FUT_STEP),
    );
    const pts = past.concat(future);

    this.updateSubsatellite(future.length ? future[0].worldPos : null);

    if (this.showOrbit) this._fill(this.orbit, pts, 1, sunDir);
    if (this.showGround) {
      const surf = pts.map((st) => st.worldPos.clone().setLength(1.006));
      this._fill(this.ground, surf.map((v) => ({ worldPos: v })), 2, sunDir);
    }
    this._updateSubdot();
  }

  _updateSubdot() {
    this.subdot.visible = this.showGround;
  }

  _fill(line, states, mode, sunDir) {
    const n = states.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const v = states[i].worldPos;
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      const lit = v.clone().normalize().dot(sunDir) > 0.05;
      c.copy(lit ? COLOR_DAY : COLOR_NIGHT);
      const age = i / (n - 1); // 0 oldest ... 1 current
      const fade = mode === 1 ? 0.35 + 0.65 * age : 0.9;
      col[i * 3] = c.r * fade;
      col[i * 3 + 1] = c.g * fade;
      col[i * 3 + 2] = c.b * fade;
    }
    const geo = new LineGeometry();
    geo.setPositions(pos);
    geo.setColors(col);
    line.geometry.dispose();
    line.geometry = geo;
  }

  updateSubsatellite(worldPos) {
    if (!worldPos) return;
    const p = worldPos.clone().setLength(1.008);
    this.subdot.position.copy(p);
  }
}