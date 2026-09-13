// Alignment verification for the globe's painted->ECEF frame transform.
//
// Contract (from src/scene/Globe.js):
//   * World frame == ECEF frame (+Z north pole, +X 0°E, +Y 90°E).
//   * Painted sphere geometry is "y-up" (painted north = +y, lon 0 = +z,
//     lon 90E = +x) and is registered so that each geographic (lat, lon)
//     point displays at texture column u = (lon + 180) / 360 and row
//     v = (90 - lat) / 180 (dateline-left equirectangular, north-up).
//   * The globe group rotation is: q = qz(-90°) * (painted -> ECEF basis).
//
// For any point we verify that the three.js SphereGeometry UV that its world
// direction maps to equals the expected (u, v) above.

const anchors = [
  ['DR Congo (0,20)', 0, 20],
  ['Amazon (0,-65)', 0, -65],
  ['Germany (48,10)', 48, 10],
  ['China (30,110)', 30, 110],
  ['Colorado (40,-105)', 40, -105],
  ['Australia (-25,135)', -25, 135],
  ['Pacific (0,-140)', 0, -140],
  ['Indian Ocean (0,45)', 0, 45],
  ['E Pacific (15,-115)', 15, -115],
  ['SE Pacific (-30,-110)', -30, -110],
  ['N Atlantic (25,-35)', 25, -35],
  ['Tasman Sea (-40,150)', -40, 150],
];

// Painted->ECEF basis columns as used in Globe.js:
//   painted +x -> ECEF +y, painted +y -> ECEF +z, painted +z -> ECEF +x.
function basisQuat() {
  const R = [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ];
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = [
    R[0][0], R[0][1], R[0][2],
    R[1][0], R[1][1], R[1][2],
    R[2][0], R[2][1], R[2][2],
  ];
  const tr = m00 + m11 + m22;
  if (tr > 0) {
    const S = Math.sqrt(tr + 1) * 2;
    return [0.25 * S, (m21 - m12) / S, (m02 - m20) / S, (m10 - m01) / S];
  }
  if (m00 > m11 && m00 > m22) {
    const S = Math.sqrt(1 + m00 - m11 - m22) * 2;
    return [(m21 - m12) / S, 0.25 * S, (m01 + m10) / S, (m02 + m20) / S];
  }
  if (m11 > m22) {
    const S = Math.sqrt(1 + m11 - m00 - m22) * 2;
    return [(m02 - m20) / S, (m01 + m10) / S, 0.25 * S, (m12 + m21) / S];
  }
  const S = Math.sqrt(1 + m22 - m00 - m11) * 2;
  return [(m10 - m01) / S, (m02 + m20) / S, (m12 + m21) / S, 0.25 * S];
}

const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qInv = (q) => {
  const n = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
  return [q[0] / n, -q[1] / n, -q[2] / n, -q[3] / n];
};
const qRot = (q, v) => {
  const qv = [0, v[0], v[1], v[2]];
  const t = qMul(qMul(q, qv), qInv(q));
  return [t[1], t[2], t[3]];
};
// Three.js SphereGeometry parameterization:
//   x = -cos(phi)*sin(theta), y = cos(theta), z = sin(phi)*sin(theta)
// gives u = phi/2pi, v = theta/pi.
function displayedUV(worldDir, qInvTotal) {
  const p = qRot(qInvTotal, worldDir);
  const theta = Math.acos(Math.max(-1, Math.min(1, p[1])));
  const phi = Math.atan2(p[2], -p[0]);
  let u = phi / (2 * Math.PI);
  if (u < 0) u += 1;
  return { u, v: theta / Math.PI };
}

function worldDirOf(latDeg, lonDeg) {
  const la = (latDeg * Math.PI) / 180;
  const lo = (lonDeg * Math.PI) / 180;
  return [
    Math.cos(la) * Math.cos(lo),
    Math.cos(la) * Math.sin(lo),
    Math.sin(la),
  ];
}

function main() {
  const base = basisQuat();
  const rollDeg = -90;
  const roll = [Math.cos((rollDeg * Math.PI) / 360), 0, 0, Math.sin((rollDeg * Math.PI) / 360)];
  const total = qMul(roll, base);
  const totalInv = qInv(total);

  let maxU = 0;
  let maxV = 0;
  for (const [, lat, lon] of anchors) {
    const uv = displayedUV(worldDirOf(lat, lon), totalInv);
    const eU = ((((lon + 180) % 360) + 360) % 360) / 360;
    const eV = (90 - lat) / 180;
    let dU = Math.abs(uv.u - eU);
    if (dU > 0.5) dU = 1 - dU;
    const dV = Math.abs(uv.v - eV);
    maxU = Math.max(maxU, dU);
    maxV = Math.max(maxV, dV);
  }
  if (maxU > 0.01 || maxV > 0.01) {
    console.error(`FAIL alignment deviates: maxU=${maxU.toFixed(4)} maxV=${maxV.toFixed(4)}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS globe alignment (maxU=${maxU.toFixed(4)} maxV=${maxV.toFixed(4)}, ${anchors.length} anchors)`);
  }
}

main();