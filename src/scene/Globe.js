import * as THREE from 'three';

const DAY_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// World frame IS the ECEF frame: +Z = north pole, +X = 0°E, +Y = 90°E.
// The painted sphere geometry is authored "y-up" (north = +y, lon 0 = +z,
// lon 90E = +x). This rotation maps painted axes onto ECEF axes:
//   painted +x (lon 90E) -> ECEF +y, painted +y (north) -> ECEF +z, painted +z (lon 0) -> ECEF +x.
const PAINTED_TO_ECEF = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0),
);
const ECEF_Z = new THREE.Vector3(0, 0, 1);
const Q_PAINTED_TO_ECEF = new THREE.Quaternion().setFromRotationMatrix(PAINTED_TO_ECEF);
// The bundled equirectangular textures are registered with 0°E at u = 0.5
// (left edge = 180°W). After the painted->ECEF basis rotation the longitude
// lands 90° off, so roll the globe -90° about the pole.
const DEFAULT_ROLL_DEG = -90;

const DAY_FRAG = /* glsl */ `
  uniform sampler2D mapDay;
  uniform sampler2D mapNight;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vec3 n = normalize(vNormalW);
    float ndl = dot(n, normalize(sunDir));
    float day = smoothstep(-0.2, 0.28, ndl);
    vec3 dayCol = texture2D(mapDay, vUv).rgb;
    vec3 nightCol = texture2D(mapNight, vUv).rgb;
    vec3 col = mix(nightCol * 1.6, dayCol, day);
    float spec = pow(max(ndl, 0.0), 24.0) * 0.0;
    col += vec3(spec);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 atmoColor;
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vec3 viewDir = normalize(-vPos);
    float rim = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 3.0);
    gl_FragColor = vec4(atmoColor, rim * intensity);
  }
`;

export class Globe {
  constructor(scene, textures) {
    this.group = new THREE.Group();
    this.textures = textures;
    this.scene = scene;
    this.graticuleVisible = false;
    this.rollDeg = 0;

    this.sunDir = new THREE.Vector3(0.7, 0.3, 0.6).normalize();

    this._buildEarth();
    this._buildClouds();
    this._buildAtmosphere();
    this._buildGraticule();

    this.setTextureRoll(DEFAULT_ROLL_DEG);
    scene.add(this.group);
  }

  _buildEarth() {
    const geo = new THREE.SphereGeometry(1, 96, 64);
    if (this.textures?.day) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          mapDay: { value: this.textures.day },
          mapNight: { value: this.textures.night },
          sunDir: { value: this.sunDir },
        },
        vertexShader: DAY_VERT,
        fragmentShader: DAY_FRAG,
      });
      this.earth = new THREE.Mesh(geo, mat);
    } else {
      const mat = new THREE.MeshLambertMaterial({ color: 0x2b6cb0, emissive: 0x16324f });
      this.earth = new THREE.Mesh(geo, mat);
      this.earth.material.userData.fallback = true;
    }
    this.group.add(this.earth);
  }

  _buildClouds() {
    const mat = new THREE.MeshLambertMaterial({
      map: this.textures.clouds,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 64, 48), mat);
    this.group.add(this.clouds);
  }

  _buildAtmosphere() {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        atmoColor: { value: new THREE.Color(0x4aa5ff) },
        intensity: { value: 0.9 },
      },
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(1.14, 64, 48), mat);
    this.group.add(this.atmo);
  }

  _buildGraticule() {
    const pts = [];
    const LATS = [-60, -30, 0, 30, 60];
    const LONS = 36;
    for (const lat of LATS) {
      for (let i = 0; i <= LONS; i++) {
        const lon = (i / LONS) * 360 - 180;
        pts.push(latLon(lat, lon, 1.005));
        pts.push(latLon(lat, (i + 1 > LONS ? 0 : (i + 1) / LONS) * 360 - 180, 1.005));
      }
    }
    const latStep = 18;
    for (let i = 0; i * latStep < 360; i++) {
      const lon = i * latStep;
      for (let j = -8; j <= 8; j++) {
        const a1 = latLon(Math.max(-90, j * 15), lon, 1.005);
        const a2 = latLon(Math.min(90, (j + 1) * 15), lon, 1.005);
        pts.push(a1, a2);
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x6ba4ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.graticule = new THREE.LineSegments(geo, mat);
    this.graticule.visible = false;
    this.group.add(this.graticule);
  }

  setTextureRoll(deg) {
    this.rollDeg = ((deg % 360) + 360) % 360;
    this._refreshOrientation();
  }

  _refreshOrientation() {
    const q = new THREE.Quaternion();
    if (this.rollDeg) {
      q.setFromAxisAngle(ECEF_Z, THREE.MathUtils.degToRad(this.rollDeg));
      q.multiply(Q_PAINTED_TO_ECEF);
    } else {
      q.copy(Q_PAINTED_TO_ECEF);
    }
    this.group.quaternion.copy(q);
  }

  setSunDirection(dir) {
    this.sunDir.copy(dir);
    if (this.earth.material.uniforms) {
      this.earth.material.uniforms.sunDir.value.copy(dir);
    }
  }

  setGraticuleVisible(v) {
    this.graticuleVisible = v;
    this.graticule.visible = v;
  }
}

function latLon(lat, lon, radius) {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = THREE.MathUtils.degToRad(lon);
  const x = radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.sin(phi);
  const z = radius * Math.cos(phi) * Math.cos(theta);
  return new THREE.Vector3(x, y, z);
}