import { describe, expect, it } from 'vitest';
import { SessionTracker } from './sessionTracker.js';

describe('SessionTracker', () => {
  it('accumulates monitored time only while a face is present', () => {
    const tracker = new SessionTracker(1000);
    tracker.tick(2000, { facePresent: true });
    tracker.tick(3000, { facePresent: false });
    tracker.tick(4000, { facePresent: true });
    expect(tracker.monitoredMs).toBe(2000);
  });

  it('caps a single delta so a suspended tab cannot inflate monitoring time', () => {
    const tracker = new SessionTracker(0);
    tracker.tick(60000, { facePresent: true });
    expect(tracker.monitoredMs).toBe(1500);
  });

  it('counts blinks and derives an average rate', () => {
    const tracker = new SessionTracker(0);
    for (let index = 0; index < 6; index += 1) tracker.recordBlink(index * 1000);
    tracker.tick(60000, { facePresent: true, blinkRate: 6 });
    // 60 seconds of monitoring (capped per tick), so the rate uses real time.
    tracker.monitoredMs = 60000;
    expect(tracker.averageBlinkRate()).toBeCloseTo(6);
  });

  it('never reports a blink rate before the minimum sample window', () => {
    const tracker = new SessionTracker(0);
    tracker.recordBlink(100);
    tracker.tick(1000, { facePresent: true });
    expect(tracker.averageBlinkRate()).toBe(0);
  });

  it('produces a record with clamped monitored time and a final sample', () => {
    const tracker = new SessionTracker(0);
    tracker.tick(1500, { facePresent: true, blinkRate: 14 });
    tracker.recordBlink(800);
    tracker.monitoredMs = 8000;
    const record = tracker.toRecord(10000);
    expect(record.id).toMatch(/^live-/);
    expect(record.monitoredMs).toBe(8000);
    expect(record.monitoredMs).toBeLessThanOrEqual(record.durationMs);
    expect(record.series.length).toBe(1);
    expect(record.series[0].blinks).toBe(1);
    expect(record.averageBlinkRate).toBeGreaterThan(0);
  });

  it('marks demo sessions as simulated', () => {
    const tracker = new SessionTracker(500, { mode: 'demo' });
    tracker.tick(600, { facePresent: true });
    const record = tracker.toRecord(900);
    expect(record.mode).toBe('demo');
    expect(record.simulated).toBe(true);
  });

  it('keeps a bounded sample series', () => {
    const tracker = new SessionTracker(0, { sampleIntervalMs: 1000, maxSamples: 3 });
    for (let second = 6; second <= 20; second += 1) {
      tracker.monitoredMs = second * 1000;
      tracker.tick(second * 1000, { facePresent: true, blinkRate: 12 });
      tracker.lastSampleAt -= 1000;
    }
    expect(tracker.series.length).toBe(3);
  });

  it('tracks peak and lowest rate samples', () => {
    const tracker = new SessionTracker(0);
    tracker.monitoredMs = 10000;
    tracker.tick(1000, { facePresent: true, blinkRate: 18 });
    tracker.tick(2000, { facePresent: true, blinkRate: 7 });
    expect(tracker.peakBlinkRate).toBe(18);
    expect(tracker.lowestBlinkRate).toBe(7);
  });
});
