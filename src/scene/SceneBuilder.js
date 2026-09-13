import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneBuilder {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.001,
      2000,
    );
    this.camera.position.set(0, 1.4, 3.0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.0008;
    this.controls.maxDistance = 40;
    this.controls.zoomSpeed = 0.8;

    this._addLights();
    this._addStars();

    window.addEventListener('resize', () => this.onResize());
  }

  _addLights() {
    this.ambient = new THREE.AmbientLight(0x22304a, 2.2);
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 3.2);
    this.sunLight.position.set(5, 3, 5);
    this.fillLight = new THREE.DirectionalLight(0x8899bb, 0.25);
    this.scene.add(this.ambient, this.sunLight, this.fillLight);
  }

  _addStars() {
    const count = 2200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const v = randomSpherePoint();
      positions[i * 3] = v.x * 900;
      positions[i * 3 + 1] = v.y * 900;
      positions[i * 3 + 2] = v.z * 900;
      color.setHSL(0.6 + Math.random() * 0.2, 0.2, 0.65 + Math.random() * 0.35);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.9,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this._resizeHandler) this._resizeHandler(w, h);
  }

  setResizeHandler(fn) {
    this._resizeHandler = fn;
  }

  updateSunDirection(dirEcf) {
    this.sunLight.position.copy(dirEcf).multiplyScalar(30);
    this.fillLight.position.copy(dirEcf).multiplyScalar(-30);
  }
}

function randomSpherePoint() {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  );
}