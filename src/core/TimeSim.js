export class TimeSim {
  constructor(date = new Date(), speed = 1) {
    this.simTime = date instanceof Date ? new Date(date) : new Date();
    this.speed = speed;
    this.paused = false;
    this.lastWall = performance.now();
  }

  tick(now = performance.now()) {
    const dtWall = (now - this.lastWall) / 1000;
    this.lastWall = now;
    if (!this.paused) {
      // Cap at one real second so a dropped/backgrounded frame never jumps the
      // clock by minutes; the simulation simply lags behind wall time.
      const dt = Math.min(dtWall, 1);
      this.simTime.setTime(this.simTime.getTime() + dt * 1000 * this.speed);
    }
    return this.simTime;
  }

  setSpeed(speed) {
    this.speed = speed;
    this.paused = speed === 0;
    return this.speed;
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  seek(date) {
    this.simTime = date instanceof Date ? new Date(date) : new Date();
  }

  clampToNow() {
    this.simTime = new Date();
  }
}

export function formatSimTime(date) {
  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}