const SPEEDS = [1, 10, 100, 1000];
const VIEWS = [
  ['follow', 'Follow ISS'],
  ['free', 'Free orbit'],
  ['overview', 'Overview'],
];

export class ControlBar {
  constructor(container, state, callbacks) {
    this.state = state;
    this.cb = callbacks;
    this.el = document.createElement('section');
    this.el.className = 'controls';
    this.el.setAttribute('aria-label', 'Simulation controls');
    this.el.innerHTML = `
      <div class="controls__row">
        <div class="seg btn-group" role="group" aria-label="Playback speed">
          ${SPEEDS.map(
            (s) =>
              `<button class="chip speed-btn" data-speed="${s}" aria-pressed="false">${xSpeed(s)}</button>`,
          ).join('')}
        </div>
        <button class="chip primary pause-btn" aria-pressed="false">⏸ Pause</button>
        <button class="chip reverse-btn" aria-pressed="false">⏪ Reverse</button>
        <span class="spacer"></span>
        <span class="clock" aria-label="Simulation time">—</span>
        <button class="chip now-btn" title="Resync to real time">Now</button>
        <label class="seek-label" title="Jump to a UTC date/time">
          <input class="seek" type="datetime-local" step="1" aria-label="Simulation time (UTC)" />
        </label>
        <span class="spacer"></span>
        <div class="seg btn-group" role="group" aria-label="View mode">
          ${VIEWS.map(
            ([id, label]) =>
              `<button class="chip view-btn" data-view="${id}" aria-pressed="false">${label}</button>`,
          ).join('')}
        </div>
      </div>
      <div class="controls__row">
        <label class="tgl"><input type="checkbox" data-toggle="showGrid"><span>Grid</span></label>
        <label class="tgl"><input type="checkbox" checked data-toggle="showOrbit"><span>Orbit path</span></label>
        <label class="tgl"><input type="checkbox" checked data-toggle="showGround"><span>Ground track</span></label>
        <span class="spacer"></span>
        <button class="chip help-btn">About</button>
      </div>
    `;
    container.appendChild(this.el);
    this.clockEl = this.el.querySelector('.clock');
    this._bind();
    this.setState(this.state);
  }

  _bind() {
    this.el.querySelectorAll('.speed-btn').forEach((b) =>
      b.addEventListener('click', () => this.cb.onSpeed(Number(b.dataset.speed))),
    );
    this.el.querySelector('.pause-btn').addEventListener('click', () => this.cb.onPause());
    this.el.querySelector('.reverse-btn').addEventListener('click', () => this.cb.onReverse());
    this.el.querySelector('.now-btn').addEventListener('click', () => this.cb.onSeek(null));
    this.el.querySelector('.seek').addEventListener('change', (e) => {
      if (e.target.value) this.cb.onSeek(parseUtcInput(e.target.value).toISOString());
    });
    this.el.querySelectorAll('.view-btn').forEach((b) =>
      b.addEventListener('click', () => this.cb.onView(b.dataset.view)),
    );
    this.el.querySelectorAll('[data-toggle]').forEach((inp) =>
      inp.addEventListener('change', () => this.cb.onToggle(inp.dataset.toggle, inp.checked)),
    );
    this.el.querySelector('.help-btn').addEventListener('click', () => this.cb.onHelp());
  }

  setSpeed(speed) {
    this.state.speed = speed;
    this.el.querySelectorAll('.speed-btn').forEach((b) => {
      const on = Number(b.dataset.speed) === speed;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  setPaused(paused) {
    this.state.paused = paused;
    const btn = this.el.querySelector('.pause-btn');
    btn.textContent = paused ? '▶ Play' : '⏸ Pause';
    btn.classList.toggle('active', paused);
    btn.setAttribute('aria-pressed', String(paused));
  }

  setView(view) {
    this.state.view = view;
    this.el.querySelectorAll('.view-btn').forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  setClock(text) {
    this.clockEl.textContent = text;
    const input = this.el.querySelector('.seek');
    if (!input || document.activeElement === input) return;
    const simUtc = new Date(text).getTime();
    const inputMs = parseUtcInput(input.value).getTime();
    if (Number.isNaN(inputMs) || Math.abs(simUtc - inputMs) > 1500) {
      input.value = toLocalInput(new Date(text));
    }
  }

  setState(state) {
    this.setSpeed(state.speed);
    this.setPaused(state.paused);
    this.setView(state.view);
    this.el.querySelector('[data-toggle="showOrbit"]').checked = state.showOrbit;
    this.el.querySelector('[data-toggle="showGround"]').checked = state.showGround;
    this.el.querySelector('[data-toggle="showGrid"]').checked = state.showGrid;
  }
}

function xSpeed(s) {
  return s === 1 ? '1×' : `${s}×`;
}

function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

function parseUtcInput(value) {
  return new Date(value.length ? (value.endsWith('Z') ? value : value + 'Z') : value);
}