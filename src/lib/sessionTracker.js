import { MIN_RATE_SAMPLE_MS } from './constants.js';

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

/**
 * Accumulates the numbers for one monitoring session. The tracker is mutable on
 * purpose: it is updated from the detection loop at ~15 fps and only converted
 * into a plain record when stats are published or the session ends.
 */
export class SessionTracker {
  constructor(now, { mode = 'live', calibration = null, sampleIntervalMs = 15000, maxSamples = 240 } = {}) {
    this.id = `${mode}-${now}-${Math.random().toString(36).slice(2, 8)}`;
    this.mode = mode;
    this.startedAt = now;
    this.lastTickAt = now;
    this.monitoredMs = 0;
    this.blinkCount = 0;
    this.series = [];
    this.lastSampleAt = now;
    this.sampleIntervalMs = sampleIntervalMs;
    this.maxSamples = maxSamples;
    this.peakBlinkRate = 0;
    this.lowestBlinkRate = null;
    this.calibration = calibration
      ? {
          openBaseline: calibration.openBaseline,
          source: calibration.source ?? 'guided',
          updatedAt: calibration.updatedAt ?? now,
        }
      : null;
  }

  recordBlink(now = this.lastTickAt) {
    this.blinkCount += 1;
    this.lastBlinkAt = now;
  }

  /**
   * Advance the clock. Monitoring time only grows while a face is visible, and
   * a single delta is capped so a suspended tab cannot inflate the session.
   */
  tick(now, { facePresent = false, blinkRate = 0 } = {}) {
    if (!Number.isFinite(now)) return;
    const delta = Math.min(Math.max(now - this.lastTickAt, 0), 1500);
    this.lastTickAt = Math.max(this.lastTickAt, now);
    if (facePresent) this.monitoredMs += delta;

    if (Number.isFinite(blinkRate) && this.monitoredMs >= MIN_RATE_SAMPLE_MS) {
      if (blinkRate > this.peakBlinkRate) this.peakBlinkRate = round(blinkRate);
      if (this.lowestBlinkRate === null || blinkRate < this.lowestBlinkRate) {
        this.lowestBlinkRate = round(blinkRate);
      }
    }

    if (now - this.lastSampleAt >= this.sampleIntervalMs && this.monitoredMs >= MIN_RATE_SAMPLE_MS) {
      this.lastSampleAt = now;
      this.pushSample(now, blinkRate);
    }
  }

  pushSample(now, blinkRate) {
    this.series.push({
      t: Math.round((now - this.startedAt) / 1000),
      rate: round(blinkRate),
      blinks: this.blinkCount,
    });
    if (this.series.length > this.maxSamples) this.series.shift();
  }

  averageBlinkRate() {
    if (this.monitoredMs < MIN_RATE_SAMPLE_MS) return 0;
    return round(this.blinkCount / (this.monitoredMs / 60000));
  }

  snapshot(now = this.lastTickAt) {
    return {
      id: this.id,
      startedAt: this.startedAt,
      durationMs: Math.max(0, now - this.startedAt),
      monitoredMs: Math.round(this.monitoredMs),
      blinkCount: this.blinkCount,
      averageBlinkRate: this.averageBlinkRate(),
      facePresent: this.monitoredMs > 0,
    };
  }

  toRecord(now = this.lastTickAt) {
    const durationMs = Math.max(0, now - this.startedAt);
    const monitoredMs = Math.min(Math.round(this.monitoredMs), Math.round(durationMs));

    const series = [...this.series];
    if (series.length === 0 && monitoredMs >= MIN_RATE_SAMPLE_MS) {
      series.push({ t: Math.round(durationMs / 1000), rate: round(this.averageBlinkRate()), blinks: this.blinkCount });
    }

    return {
      id: this.id,
      mode: this.mode,
      simulated: this.mode === 'demo',
      startedAt: this.startedAt,
      endedAt: now,
      durationMs,
      monitoredMs,
      blinkCount: this.blinkCount,
      averageBlinkRate: this.averageBlinkRate(),
      peakBlinkRate: this.peakBlinkRate,
      lowestBlinkRate: this.lowestBlinkRate,
      calibration: this.calibration,
      series,
    };
  }
}
