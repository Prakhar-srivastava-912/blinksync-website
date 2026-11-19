import { DEFAULT_EAR_BASELINE } from './constants.js';
import { median } from './eyeMetrics.js';

/**
 * Map the 0..1 sensitivity slider to EAR thresholds relative to the calibrated
 * open-eye baseline. Higher sensitivity closes the eye at a higher EAR.
 */
export function resolveThresholds(sensitivity = 0.55) {
  const value = Math.min(1, Math.max(0, Number.isFinite(sensitivity) ? sensitivity : 0.55));
  const closeRatio = 0.82 - 0.26 * value;
  return {
    closeRatio,
    openRatio: Math.min(0.96, closeRatio + 0.15),
  };
}

export const DETECTOR_EVENTS = {
  BLINK: 'blink',
  PROLONGED: 'prolonged-closure',
  RESET: 'reset',
};

/**
 * Turns a stream of EAR readings into blink events.
 *
 * A blink is only counted when the eye goes open -> closed -> open again and
 * the closed phase lasts between `minBlinkMs` and `maxBlinkMs`. Longer closures
 * are reported as `prolonged-closure` (a staring/resting episode) and are never
 * counted as multiple blinks. Missing frames reset the state machine instead of
 * producing phantom blinks.
 */
export class BlinkDetector {
  constructor({
    sensitivity = 0.55,
    baseline = DEFAULT_EAR_BASELINE,
    minBlinkMs = 60,
    maxBlinkMs = 600,
    cooldownMs = 90,
    smoothingSamples = 3,
    maxFrameGapMs = 450,
  } = {}) {
    this.sensitivity = sensitivity;
    this.baseline = Number.isFinite(baseline) && baseline > 0 ? baseline : DEFAULT_EAR_BASELINE;
    this.minBlinkMs = minBlinkMs;
    this.maxBlinkMs = maxBlinkMs;
    this.cooldownMs = cooldownMs;
    this.smoothingSamples = smoothingSamples;
    this.maxFrameGapMs = maxFrameGapMs;
    this.reset();
  }

  reset() {
    const thresholds = resolveThresholds(this.sensitivity);
    this.thresholds = {
      closeEar: this.baseline * thresholds.closeRatio,
      openEar: this.baseline * thresholds.openRatio,
    };
    this.phase = 'open';
    this.buffer = [];
    this.closedSince = null;
    this.lastFrameAt = null;
    this.lastBlinkAt = null;
    this.blinkCount = 0;
    this.lastEar = null;
  }

  setBaseline(baseline) {
    if (Number.isFinite(baseline) && baseline > 0.02) {
      this.baseline = baseline;
      this.reset();
    }
  }

  setSensitivity(sensitivity) {
    if (!Number.isFinite(sensitivity)) return;
    const changed = Math.abs(sensitivity - this.sensitivity) > 1e-3;
    this.sensitivity = sensitivity;
    if (changed) {
      const thresholds = resolveThresholds(sensitivity);
      this.thresholds = {
        closeEar: this.baseline * thresholds.closeRatio,
        openEar: this.baseline * thresholds.openRatio,
      };
    }
  }

  /** Feed a missing frame (face lost); resets without counting anything. */
  markMissed(timestamp) {
    const shouldReset = this.phase !== 'open' || this.buffer.length > 0;
    this.buffer = [];
    this.phase = 'open';
    this.closedSince = null;
    this.lastFrameAt = Number.isFinite(timestamp) ? timestamp : null;
    return shouldReset ? DETECTOR_EVENTS.RESET : null;
  }

  /**
   * @param {number|null} ear Raw Eye Aspect Ratio for the frame.
   * @param {number} timestamp Monotonic timestamp in milliseconds.
   */
  feed(ear, timestamp) {
    if (!Number.isFinite(timestamp)) return { event: null, phase: this.phase };

    if (this.lastFrameAt !== null && timestamp - this.lastFrameAt > this.maxFrameGapMs) {
      // Missed frames: the eye state is unknown, so restart from open.
      this.buffer = [];
      this.phase = 'open';
      this.closedSince = null;
    }
    this.lastFrameAt = timestamp;

    if (!Number.isFinite(ear) || ear <= 0) {
      this.markMissed(timestamp);
      return { event: null, phase: this.phase };
    }

    this.lastEar = ear;
    this.buffer.push(ear);
    if (this.buffer.length > this.smoothingSamples) this.buffer.shift();
    const smoothedEar = this.smoothingSamples > 1 ? median(this.buffer) ?? ear : ear;

    let event = null;

    if (this.phase === 'open') {
      if (smoothedEar < this.thresholds.closeEar) {
        this.phase = 'closed';
        this.closedSince = timestamp;
      }
    } else if (smoothedEar > this.thresholds.openEar) {
      const closedMs = timestamp - this.closedSince;
      const sinceLastBlink = this.lastBlinkAt === null ? Infinity : timestamp - this.lastBlinkAt;

      if (closedMs >= this.minBlinkMs && closedMs <= this.maxBlinkMs && sinceLastBlink >= this.cooldownMs) {
        event = DETECTOR_EVENTS.BLINK;
        this.lastBlinkAt = timestamp;
        this.blinkCount += 1;
      } else if (closedMs > this.maxBlinkMs) {
        event = DETECTOR_EVENTS.PROLONGED;
      }

      this.phase = 'open';
      this.closedSince = null;
    }

    return {
      event,
      phase: this.phase,
      ear,
      smoothedEar,
      closedMs: this.closedSince === null ? 0 : timestamp - this.closedSince,
      baseline: this.baseline,
    };
  }
}
