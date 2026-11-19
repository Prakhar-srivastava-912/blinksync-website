import { MIN_RATE_SAMPLE_MS } from './constants.js';

/**
 * Rolling-window blink rate. Blinks are stored as timestamps and pruned to the
 * window, so the rate reflects recent activity rather than a whole session.
 */
export class BlinkRateTracker {
  constructor({ windowMs = 60000 } = {}) {
    this.windowMs = windowMs;
    this.timestamps = [];
  }

  reset() {
    this.timestamps = [];
  }

  add(timestamp) {
    if (!Number.isFinite(timestamp)) return;
    this.timestamps.push(timestamp);
    this.prune(timestamp);
  }

  prune(now = Number.isFinite(this.timestamps.at(-1)) ? this.timestamps.at(-1) : Date.now()) {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }

  count(now) {
    this.prune(now);
    return this.timestamps.length;
  }

  /**
   * Blinks per minute inside the window. `observedMs` is how long monitoring has
   * actually been active, which prevents absurd rates in the first seconds.
   */
  rate(now, observedMs = this.windowMs) {
    if (!Number.isFinite(now)) return 0;
    const observed = Math.min(this.windowMs, Math.max(0, Number(observedMs) || 0));
    if (observed < MIN_RATE_SAMPLE_MS) return 0;
    this.prune(now);
    return (this.timestamps.length / observed) * 60000;
  }

  /** Rate over the window using observed time spanning exactly the window. */
  steadyRate(now, sessionStart, observedMs) {
    const observed = Math.min(this.windowMs, Math.max(0, Number(observedMs) || 0));
    const span = Math.min(observed, Math.max(MIN_RATE_SAMPLE_MS, now - sessionStart));
    if (span < MIN_RATE_SAMPLE_MS) return 0;
    this.prune(now);
    return (this.timestamps.length / span) * 60000;
  }
}
