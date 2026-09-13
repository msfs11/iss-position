import * as THREE from 'three';
import * as satellite from 'satellite.js';
import {
  propagateEci,
  gmstFromDate,
  eciToEcfVec,
  ecfToWorldVec,
  sunDirectionEcf,
} from './math.js';

export const EARTH_ROT = 7.2921159e-5; // rad/s

export class Propagator {
  constructor(satrec) {
    this.satrec = satrec;
  }

  orbitalElements() {
    const r = this.satrec;
    const inclination = satellite.radiansToDegrees(r.inclo);
    // satrec.no is mean motion in radians/minute -> period in minutes.
    const periodMin = (2 * Math.PI) / r.no;
    return {
      inclination,
      eccentricity: r.ecco,
      raan: satellite.radiansToDegrees(r.nodeo),
      argPerigee: satellite.radiansToDegrees(r.argpo),
      periodMin,
      semiMajorAxisKm: 6371 + 408,
    };
  }

  stateAt(date) {
    const eci = propagateEci(this.satrec, date);
    if (!eci) return null;
    const gmst = gmstFromDate(date);
    const ecf = eciToEcfVec(eci.position, gmst);
    const velEcf = eciToEcfVec(eci.velocity, gmst);
    const worldPos = ecfToWorldVec(ecf);
    const geodetic = satellite.eciToGeodetic(eci.position, gmst);
    const vInertial = new THREE.Vector3(velEcf.x, velEcf.y, velEcf.z);
    const r = new THREE.Vector3(ecf.x, ecf.y, ecf.z);
    // Ground-relative velocity subtracts the co-rotating reference frame:
    // v_ground = v_inertial (ECEF basis) − ω × r.
    const omegaCrossR = new THREE.Vector3(-EARTH_ROT * ecf.y, EARTH_ROT * ecf.x, 0);
    const vGround = vInertial.clone().sub(omegaCrossR);
    return {
      date,
      worldPos,
      velEcf: vInertial,
      velDir: vInertial.clone().normalize(),
      groundSpeed: vGround.length(),
      geodetic: {
        lat: satellite.radiansToDegrees(geodetic.latitude),
        lon: satellite.radiansToDegrees(geodetic.longitude),
        altKm: geodetic.height,
      },
    };
  }

  sampleOrbit(centerDate, count, stepMs) {
    const points = [];
    const dir = stepMs >= 0 ? 1 : -1;
    const absStep = Math.abs(stepMs);
    for (let i = 0; i < count; i++) {
      const t = centerDate.getTime() + i * dir * absStep;
      const st = this.stateAt(new Date(t));
      if (st) points.push(st);
    }
    return points;
  }

  samplePastAndFuture(date, pastCount, pastStepMs, futureCount, futureStepMs) {
    const past = this.sampleOrbit(date, pastCount, -pastStepMs);
    const future = this.sampleOrbit(date, futureCount, futureStepMs);
    return { past, future };
  }
}

export function currentSunDirection(date) {
  return sunDirectionEcf(date);
}