import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { UNITS_PER_KM, EARTH_RADIUS_KM } from '../core/constants.js';

export function jdayFromDate(date) {
  return satellite.jday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds() + date.getUTCMilliseconds() / 1000,
  );
}

export function gmstFromDate(date) {
  return satellite.gstime(date);
}

export function propagateEci(satrec, date) {
  const state = satellite.propagate(satrec, date);
  return state && state.position ? state : null;
}

export function eciToEcfVec(v, gmst) {
  return satellite.eciToEcf({ x: v.x, y: v.y, z: v.z }, gmst);
}

export function ecfToWorldVec(v) {
  return new THREE.Vector3(v.x * UNITS_PER_KM, v.y * UNITS_PER_KM, v.z * UNITS_PER_KM);
}

export function sunDirectionEcf(date) {
  const { rsun } = satellite.sunPos(jdayFromDate(date));
  const gmst = gmstFromDate(date);
  const e = satellite.eciToEcf({ x: rsun.x, y: rsun.y, z: rsun.z }, gmst);
  const dir = new THREE.Vector3(e.x, e.y, e.z).normalize();
  return dir;
}

export function worldToLatLon(worldPos) {
  // World frame IS the ECEF frame (+z = north pole, +x = 0°E, +y = 90°E).
  const lat = Math.asin(THREE.MathUtils.clamp(worldPos.z / worldPos.length(), -1, 1));
  const lon = Math.atan2(worldPos.y, worldPos.x);
  return {
    lat: satellite.radiansToDegrees(lat),
    lon: satellite.radiansToDegrees(lon),
  };
}

export function latLonAltToEcf(latDeg, lonDeg, altKm) {
  const lat = satellite.degreesToRadians(latDeg);
  const lon = satellite.degreesToRadians(lonDeg);
  const r = (EARTH_RADIUS_KM + altKm) * UNITS_PER_KM;
  return new THREE.Vector3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.cos(lat) * Math.sin(lon),
    r * Math.sin(lat),
  );
}