import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Model local +Z is "forward" along its solar-truss axis; NASA glTF default.
// We remap: model +Z -> world velocity direction (-X actually after flips is fussy),
// so we wrap in an orient group and make +Z the forward axis.
const MODEL_PATH = 'models/iss.glb';
const MODEL_WIDTH_UNITS = 0.04;

export class ISS {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('draco/');
    this.loader.setDRACOLoader(draco);
    this.group = new THREE.Group();
    this.orient = new THREE.Group();
    this.group.add(this.orient);
    this.model = null;
    this.loaded = false;
    this.lit = true;
    this.scene.add(this.group);

    this.marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.004, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
    );
    this.group.add(this.marker);

    this.spot = new THREE.PointLight(0x7dd3fc, 2.0, 0.5);
    this.group.add(this.spot);
    this._load();
  }

  async _load() {
    try {
      const gltf = await this.loader.loadAsync(MODEL_PATH);
      const mesh = gltf.scene;
      mesh.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = false;
          o.material = o.material ? o.material : new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        }
      });
      this._fit(mesh);
      this.orient.add(mesh);
      this.model = mesh;
      this.loaded = true;
    } catch (err) {
      console.warn('ISS GLTF load failed, using procedural model:', err.message);
      this._buildFallback();
    }
  }

  _fit(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    const scale = MODEL_WIDTH_UNITS / max;
    mesh.scale.setScalar(scale);
  }

  _buildFallback() {
    const g = new THREE.Group();
    const grey = new THREE.MeshStandardMaterial({ color: 0x9aa7b5, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.4 });
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.008), dark);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.014, 12), blue);
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.002, 0.002), grey);
    const left = panel(new THREE.Vector3(-0.0145, 0.003, 0));
    const right = panel(new THREE.Vector3(0.0145, 0.003, 0));
    lab.rotation.x = Math.PI / 2;
    g.add(core, lab, truss, left, right);
    this.orient.add(g);
    this.model = g;
    this.loaded = true;
  }

  setLit(lit) {
    this.lit = lit;
    this.spot.color.set(lit ? 0x7dd3fc : 0x4a5568);
    this.spot.intensity = lit ? 2.0 : 0.4;
  }

  update(worldPos, velDir, radialUp) {
    this.group.position.copy(worldPos);
    const m = new THREE.Matrix4();
    const f = velDir.clone().normalize();
    const u = radialUp.clone().normalize();
    const s = new THREE.Vector3().crossVectors(u, f).normalize();
    m.makeBasis(s, u, f);
    this.orient.quaternion.setFromRotationMatrix(m);
    this.marker.position.set(0, 0, 0);
  }
}

function panel(pos) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.001), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  const cell = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.02, 0.0005),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a, emissiveIntensity: 0.7 }),
  );
  cell.position.y = 0.009;
  g.add(frame, cell);
  g.position.copy(pos);
  return g;
}