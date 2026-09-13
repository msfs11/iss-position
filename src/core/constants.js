export const EARTH_RADIUS_KM = 6371;
export const UNITS_PER_KM = 1 / EARTH_RADIUS_KM;
export const ISS_NORAD_ID = 25544;
export const ISS_ALTITUDE_KM = 408;
export const DEFAULT_SPEED = 1;
export const API = {
  openNotify: 'https://api.open-notify.org/iss-now.json',
  openNotifyAstros: 'https://api.open-notify.org/astros.json',
  whereTheIssAt: 'https://api.wheretheiss.at/v1/satellites/25544',
  celestrak: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
};