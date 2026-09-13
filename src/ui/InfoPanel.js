const FIELD_DEF = [
  ['coords', 'Sub-satellite point', '—'],
  ['alt', 'Altitude', '—'],
  ['vel', 'Velocity (ground)', '—'],
  ['period', 'Orbital period', '—'],
  ['incl', 'Inclination', '—'],
  ['ecc', 'Eccentricity', '—'],
  ['light', 'Day / night', '—'],
  ['crew', 'People in orbit', '—'],
  ['next', 'Orbit # from epoch', '—'],
];

export class InfoPanel {
  constructor(container) {
    this.el = document.createElement('aside');
    this.el.className = 'panel';
    this.el.setAttribute('aria-label', 'ISS telemetry');
    this.el.innerHTML = `
      <header class="panel__head">
        <strong>ISS live telemetry</strong>
        <button class="panel__collapse" aria-label="Collapse panel">–</button>
      </header>
      <div class="panel__body">${FIELD_DEF.map(
        ([id, label]) =>
          `<dl class="field"><dt>${label}</dt><dd id="fld-${id}">—</dd></dl>`,
      ).join('')}</div>
    `;
    this.bodyEl = this.el.querySelector('.panel__body');
    this.collapsed = false;
    this.el.querySelector('.panel__collapse').addEventListener('click', () => this.toggleCollapse());
    container.appendChild(this.el);
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.bodyEl.style.display = this.collapsed ? 'none' : '';
    this.el.querySelector('.panel__collapse').textContent = this.collapsed ? '+' : '–';
  }

  set(fieldId, value) {
    const dd = this.el.querySelector(`#fld-${fieldId}`);
    if (dd) dd.textContent = value;
  }

  update(t) {
    if (!t) return;
    const ll = fmtLatLon(t.geodetic.lat, t.geodetic.lon);
    this.set('coords', ll);
    this.set('alt', `${t.geodetic.altKm.toFixed(1)} km`);
    this.set('vel', `${t.velKmh.toFixed(0)} km/h · ${(t.velKmh / 3600).toFixed(2)} km/s`);
    this.set('period', `${t.periodMin.toFixed(1)} min`);
    this.set('incl', `${t.inclination.toFixed(2)}°`);
    this.set('ecc', t.eccentricity.toFixed(6));
    this.set('light', t.lit ? '☀️ Sunlit' : '🌑 Eclipse');
    this.set('next', t.orbitsCompleted != null ? `#${t.orbitsCompleted}` : '—');
  }
}

function fmtLatLon(lat, lon) {
  const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${la}, ${lo}`;
}