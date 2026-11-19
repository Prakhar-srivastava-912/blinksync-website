import { beforeEach, describe, expect, it } from 'vitest';
import { BlinkDetector, DETECTOR_EVENTS, resolveThresholds } from './blinkDetector.js';

const OPEN = 0.3;
const CLOSED = 0.1;

function openSequence(detector, start = 0, frames = 3, ear = OPEN) {
  for (let index = 0; index < frames; index += 1) {
    detector.feed(ear, start + index * 33);
  }
  return start + frames * 33;
}

describe('resolveThresholds', () => {
  it('closes the eye at a higher EAR as sensitivity rises', () => {
    const low = resolveThresholds(0);
    const high = resolveThresholds(1);
    expect(low.closeRatio).toBeGreaterThan(high.closeRatio);
    expect(high.closeRatio).toBeCloseTo(0.56, 5);
    expect(low.closeRatio).toBeCloseTo(0.82, 5);
    expect(high.openRatio).toBeGreaterThan(high.closeRatio);
  });

  it('clamps out-of-range sensitivity', () => {
    expect(resolveThresholds(5).closeRatio).toBeCloseTo(resolveThresholds(1).closeRatio);
    expect(resolveThresholds(Number.NaN).closeRatio).toBeCloseTo(resolveThresholds(0.55).closeRatio);
  });
});

describe('BlinkDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new BlinkDetector({ sensitivity: 0.55, baseline: OPEN, smoothingSamples: 1 });
  });

  it('counts a complete open-closed-open transition', () => {
    detector.feed(OPEN, 0);
    const closed = detector.feed(CLOSED, 100);
    expect(closed.phase).toBe('closed');
    const result = detector.feed(OPEN, 220);
    expect(result.event).toBe(DETECTOR_EVENTS.BLINK);
    expect(detector.blinkCount).toBe(1);
  });

  it('does not count closures shorter than the minimum blink duration', () => {
    detector.feed(OPEN, 0);
    detector.feed(CLOSED, 100);
    const result = detector.feed(OPEN, 130);
    expect(result.event).toBeNull();
    expect(detector.blinkCount).toBe(0);
  });

  it('reports prolonged closure without counting blinks', () => {
    detector.feed(OPEN, 0);
    detector.feed(CLOSED, 100);
    [300, 500, 700, 900].forEach((time) => detector.feed(CLOSED, time));
    const result = detector.feed(OPEN, 1100);
    expect(result.event).toBe(DETECTOR_EVENTS.PROLONGED);
    expect(detector.blinkCount).toBe(0);
  });

  it('never counts one long closure as several blinks', () => {
    detector.feed(OPEN, 0);
    for (let t = 100; t <= 900; t += 100) detector.feed(CLOSED, t);
    detector.feed(OPEN, 1000);
    expect(detector.blinkCount).toBe(0);
  });

  it('requires re-opening before another blink can count', () => {
    detector.feed(OPEN, 0);
    detector.feed(CLOSED, 100);
    detector.feed(OPEN, 200);
    detector.feed(CLOSED, 300);
    detector.feed(OPEN, 400);
    expect(detector.blinkCount).toBe(2);
  });

  it('resets the state machine when frames are dropped', () => {
    detector.feed(OPEN, 0);
    detector.feed(CLOSED, 100);
    // Next frame arrives far later: eye state is unknown, so no blink is emitted.
    const result = detector.feed(OPEN, 900);
    expect(result.event).toBeNull();
    expect(detector.blinkCount).toBe(0);
  });

  it('resets safely when the face is lost', () => {
    detector.feed(OPEN, 0);
    detector.feed(CLOSED, 100);
    expect(detector.markMissed(150)).toBe(DETECTOR_EVENTS.RESET);
    const reopened = detector.feed(OPEN, 400);
    expect(reopened.event).toBeNull();
    expect(detector.blinkCount).toBe(0);
  });

  it('honours the cooldown between blinks', () => {
    const fast = new BlinkDetector({ smoothingSamples: 1, minBlinkMs: 10, cooldownMs: 500 });
    fast.feed(OPEN, 0);
    fast.feed(CLOSED, 50);
    fast.feed(OPEN, 80);
    fast.feed(CLOSED, 120);
    fast.feed(OPEN, 150);
    expect(fast.blinkCount).toBe(1);
  });

  it('applies the calibrated baseline to its thresholds', () => {
    detector.setBaseline(0.5);
    detector.feed(0.5, 0);
    detector.feed(0.25, 100);
    expect(detector.phase).toBe('closed');
    detector.setBaseline(0.2);
    expect(detector.thresholds.closeEar).toBeLessThan(0.25);
  });

  it('smooths noise across frames', () => {
    const smooth = new BlinkDetector({ smoothingSamples: 3 });
    smooth.feed(OPEN, 0);
    smooth.feed(OPEN, 33);
    // A single noisy low sample is ignored by the median filter.
    const noisy = smooth.feed(0.05, 66);
    expect(noisy.phase).toBe('open');
  });

  it('ignores non-numeric EAR readings', () => {
    detector.feed(OPEN, 0);
    const result = detector.feed(null, 100);
    expect(result.phase).toBe('open');
    expect(detector.blinkCount).toBe(0);
  });

  it('stops counting while the sensitivity makes closure unlikely', () => {
    const strict = new BlinkDetector({ sensitivity: 0.05, baseline: OPEN, smoothingSamples: 1 });
    strict.feed(OPEN, 0);
    // 0.25 EAR is above the strict close threshold (≈0.242 × baseline).
    const closed = strict.feed(0.25, 100);
    expect(closed.phase).toBe('open');
  });

  it('tracks closed duration for the UI', () => {
    detector.feed(OPEN, 0);
    const result = detector.feed(CLOSED, 100);
    const later = detector.feed(CLOSED, 180);
    expect(result.phase).toBe('closed');
    expect(later.closedMs).toBe(80);
  });
});
