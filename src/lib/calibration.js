import { median } from './eyeMetrics.js';

/**
 * Collects open-eye EAR readings for a short guided calibration window and
 * produces a personal baseline. This adapts thresholds to a user's eyes and
 * camera distance; it is not a clinical measurement.
 */
export class CalibrationCollector {
  constructor({ durationMs = 4000, minSamples = 15, maxSamples = 500 } = {}) {
    this.durationMs = durationMs;
    this.minSamples = minSamples;
    this.maxSamples = maxSamples;
    this.startedAt = null;
    this.samples = [];
    this.lastProgress = 0;
  }

  get active() {
    return this.startedAt !== null;
  }

  start(now) {
    this.startedAt = now;
    this.samples = [];
    this.lastProgress = 0;
  }

  cancel() {
    this.startedAt = null;
    this.samples = [];
    this.lastProgress = 0;
  }

  add(ear, now) {
    if (!this.active || !Number.isFinite(ear) || ear <= 0) return false;
    if (now - this.startedAt > this.durationMs + 750) return false;
    // Ignore frames that are already clearly blinking.
    if (ear < 0.09) return false;
    this.samples.push(ear);
    if (this.samples.length > this.maxSamples) this.samples.shift();
    this.lastProgress = this.progress(now);
    return true;
  }

  progress(now) {
    if (!this.active) return 0;
    return Math.min(1, Math.max(0, (now - this.startedAt) / this.durationMs));
  }

  isComplete(now) {
    if (!this.active) return false;
    return now - this.startedAt >= this.durationMs && this.samples.length >= this.minSamples;
  }

  result(now) {
    if (this.samples.length < this.minSamples) return null;
    const baseline = median(this.samples);
    if (!baseline || !Number.isFinite(baseline) || baseline < 0.04) return null;

    return {
      openBaseline: Math.round(baseline * 1000) / 1000,
      sampleCount: this.samples.length,
      updatedAt: now,
      source: 'guided',
    };
  }
}
