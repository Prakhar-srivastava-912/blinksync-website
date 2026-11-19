import { describe, expect, it } from 'vitest';
import { BlinkRateTracker } from './blinkRate.js';

describe('BlinkRateTracker', () => {
  it('returns zero until enough monitoring time has been observed', () => {
    const tracker = new BlinkRateTracker();
    tracker.add(1000);
    tracker.add(2000);
    expect(tracker.rate(3000, 2000)).toBe(0);
  });

  it('computes blinks per minute across the observed span', () => {
    const tracker = new BlinkRateTracker({ windowMs: 60000 });
    const now = 120000;
    for (let i = 0; i < 15; i += 1) tracker.add(now - i * 1000);
    // 15 blinks over 60 seconds of monitored time.
    expect(tracker.rate(now, 60000)).toBeCloseTo(15);
  });

  it('prunes events older than the window', () => {
    const tracker = new BlinkRateTracker({ windowMs: 60000 });
    tracker.add(0);
    tracker.add(1000);
    tracker.add(110000);
    expect(tracker.count(120000)).toBe(1);
  });

  it('scales the rate by the shorter early-session window', () => {
    const tracker = new BlinkRateTracker({ windowMs: 60000 });
    const now = 30000;
    tracker.add(now - 5000);
    tracker.add(now - 10000);
    tracker.add(now - 15000);
    // 3 blinks in the last 20 seconds observed.
    expect(tracker.rate(now, 20000)).toBeCloseTo(9);
  });

  it('caps the observation window at 60 seconds', () => {
    const tracker = new BlinkRateTracker();
    const now = 600000;
    tracker.add(now - 1000);
    tracker.add(now - 2000);
    expect(tracker.rate(now, 600000)).toBeCloseTo(2);
  });

  it('resets cleanly', () => {
    const tracker = new BlinkRateTracker();
    tracker.add(1000);
    tracker.reset();
    expect(tracker.count(2000)).toBe(0);
  });
});
