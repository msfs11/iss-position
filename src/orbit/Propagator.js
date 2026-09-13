import * as THREE from 'three';
import * as satellite from 'satellite.js';
import {
  propagateEci,
  gmstFromDate,
  eciToEcfVec,
  ecfToWorldVec,
  sunDirectionEcf,
} from './math.js';

export const PERIOD_MIN = 92.9;

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
    return {
      date,
      worldPos,
      velEcf: new THREE.Vector3(velEcf.x, velEcf.y, velEcf.z),
      velDir: new THREE.Vector3(velEcf.x, velEcf.y, velEcf.z).normalize(),
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

export function orbitLighting(date, worldPos, sunDir) {
  const normal = worldPos.clone().normalize();
  return normal.dot(sunDir) > 0.0;
}

export function currentSunDirection(date) {
  return sunDirectionEcf(date);
}