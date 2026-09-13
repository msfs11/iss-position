import { API } from '../core/constants.js';

export const FALLBACK_TLE = [
  'ISS (ZARYA)',
  '1 25544U 98067A   26255.59495341  .00005107  00000+0  10048-3 0  9998',
  '2 25544  51.6306 227.4903 0004922 132.5649 227.5755 15.49091282585302',
];

export async function fetchText(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function parseStationsTle(text) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/ISS/.test(lines[i]) && /ZARYA|Zarya/.test(lines[i])) {
      const l1 = lines[i + 1];
      const l2 = lines[i + 2];
      if (l1 && l2 && l1.startsWith('1 ') && l2.startsWith('2 ')) {
        return [lines[i].trim(), l1.trim(), l2.trim()];
      }
    }
  }
  return null;
}

export async function fetchTle() {
  try {
    const text = await fetchText(API.celestrak, 12000);
    const parsed = parseStationsTle(text);
    if (parsed) return { tle: parsed, source: 'celestrak', fresh: true };
  } catch (err) {
    console.warn('CelesTrak unavailable:', err.message);
  }
  return { tle: FALLBACK_TLE, source: 'fallback', fresh: false };
}

export async function fetchLivePosition() {
  try {
    const data = await fetchJson(API.openNotify);
    if (data && data.iss_position) {
      return {
        source: 'open-notify',
        lat: parseFloat(data.iss_position.latitude),
        lon: parseFloat(data.iss_position.longitude),
        timestamp: data.timestamp * 1000,
      };
    }
  } catch (err) {
    console.warn('Open Notify unavailable:', err.message);
  }
  try {
    const d = await fetchJson(API.whereTheIssAt);
    return {
      source: 'where-the-iss-at',
      lat: d.latitude,
      lon: d.longitude,
      altKm: d.altitude,
      velocityKmh: d.velocity,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.warn('WhereTheISSAt unavailable:', err.message);
  }
  return null;
}

export async function fetchAstros() {
  try {
    const d = await fetchJson(API.openNotifyAstros, 12000);
    if (d && Array.isArray(d.people)) {
      return { count: d.people.length, people: d.people.map((p) => p.name) };
    }
  } catch (err) {
    console.warn('astros unavailable:', err.message);
  }
  return null;
}