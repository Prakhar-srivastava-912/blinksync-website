import { MIN_RATE_SAMPLE_MS } from './constants.js';

/**
 * Deterministic simulator used ONLY by DEMO mode. It produces a plausible blink
 * sequence and EAR trace so the interface can be demonstrated without a camera.
 * Every UI surface labels these numbers as simulated.
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DemoSimulator {
  constructor({ seed = 20261101, now = Date.now(), minBlinkGapMs = 2400, maxBlinkGapMs = 5600 } = {}) {
    this.random = mulberry32(seed);
    this.minBlinkGapMs = minBlinkGapMs;
    this.maxBlinkGapMs = maxBlinkGapMs;
    this.startedAt = now;
    this.nextBlinkAt = now + this.randomBetween(this.minBlinkGapMs, this.maxBlinkGapMs);
    this.blinkUntil = 0;
    this.faceLostUntil = 0;
    this.nextFaceLossAt = now + this.randomBetween(30000, 60000);
    this.baseline = 0.29 + this.random() * 0.03;
  }

  randomBetween(min, max) {
    return min + this.random() * (max - min);
  }

  /**
   * @returns {{ facePresent: boolean, ear: number|null, blink: boolean, simulated: true }}
   */
  advance(nowMs) {
    let blink = false;
    let facePresent = true;

    if (nowMs >= this.nextFaceLossAt) {
      this.faceLostUntil = nowMs + this.randomBetween(1800, 3600);
      this.nextFaceLossAt = nowMs + this.randomBetween(40000, 80000);
    }
    if (nowMs < this.faceLostUntil) facePresent = false;

    if (facePresent && nowMs >= this.nextBlinkAt) {
      this.blinkUntil = nowMs + this.randomBetween(110, 210);
      blink = true;
      this.nextBlinkAt = nowMs + this.randomBetween(this.minBlinkGapMs, this.maxBlinkGapMs);
    }

    let ear = null;
    if (facePresent) {
      if (nowMs < this.blinkUntil) {
        ear = 0.05 + this.random() * 0.04;
      } else {
        const drift = (this.random() - 0.5) * 0.03;
        ear = this.baseline + drift;
      }
    }

    return { facePresent, ear, blink, simulated: true };
  }
}

/** Local midnight for a timestamp offset by whole days. */
function dayStart(timestamp, dayOffset = 0) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - dayOffset);
  return date.getTime();
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

/**
 * Generates clearly-labelled DEMO sessions and break events for the analytics
 * screens. These are stored separately from real measurements and every value
 * carries `simulated: true`.
 */
export function createDemoHistory({ now = Date.now(), days = 7, seed = 4242 } = {}) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const sessions = [];
  const breaks = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    if (offset === 2) continue; // A realistic gap day.
    const base = dayStart(now, offset);
    const sessionsToday = 1 + Math.floor(random() * 2);

    for (let index = 0; index < sessionsToday; index += 1) {
      const startHour = 9 + Math.floor(random() * 9) + index;
      const startedAt = base + startHour * 3600000 + Math.floor(random() * 900000);
      if (startedAt > now - 60000) continue;

      const durationMs = Math.round((6 + random() * 18) * 60000);
      const endedAt = Math.min(now, startedAt + durationMs);
      const monitoredMs = Math.round((endedAt - startedAt) * (0.72 + random() * 0.2));
      if (monitoredMs < MIN_RATE_SAMPLE_MS) continue;
      const averageBlinkRate = round(10 + random() * 12);
      const blinkCount = Math.round((monitoredMs / 60000) * averageBlinkRate);
      const points = Math.max(3, Math.min(12, Math.round(durationMs / 90000)));

      sessions.push({
        id: `demo-sample-${offset}-${index}-${startedAt}`,
        mode: 'demo',
        simulated: true,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        monitoredMs,
        blinkCount,
        averageBlinkRate,
        peakBlinkRate: round(averageBlinkRate + 4 + random() * 4),
        lowestBlinkRate: round(Math.max(2, averageBlinkRate - 4 - random() * 4)),
        calibration: { openBaseline: 0.29, source: 'guided', updatedAt: startedAt },
        series: Array.from({ length: points }, (_, pointIndex) => ({
          t: Math.round(((pointIndex + 1) / points) * ((endedAt - startedAt) / 1000)),
          rate: round(averageBlinkRate + (random() - 0.5) * 7),
          blinks: Math.round((blinkCount * (pointIndex + 1)) / points),
        })),
      });
    }

    const due = 3 + Math.floor(random() * 3);
    const completed = Math.min(due, Math.round(random() * due));
    for (let index = 0; index < due; index += 1) {
      const dueAt = base + (10 + index * 2) * 3600000 + Math.floor(random() * 600000);
      if (dueAt > now) continue;
      breaks.push({
        id: `demo-break-${offset}-${index}-${dueAt}`,
        dueAt,
        resolvedAt: dueAt + 20000,
        status: index < completed ? 'completed' : index === completed ? 'postponed' : 'skipped',
        durationSec: index < completed ? 20 : 0,
        snoozes: index === completed ? 1 : 0,
        simulated: true,
      });
    }
  }

  return { sessions, breaks };
}
