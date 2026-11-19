import { describe, expect, it } from 'vitest';
import { DemoSimulator, createDemoHistory } from './demoSimulator.js';

describe('DemoSimulator', () => {
  it('is deterministic for a seed', () => {
    const a = new DemoSimulator({ seed: 99, now: 0 });
    const b = new DemoSimulator({ seed: 99, now: 0 });
    const readingsA = [];
    const readingsB = [];
    for (let t = 0; t <= 60000; t += 250) {
      readingsA.push(a.advance(t));
      readingsB.push(b.advance(t));
    }
    expect(readingsA).toEqual(readingsB);
  });

  it('produces blinks and open-eye EAR readings over time', () => {
    const simulator = new DemoSimulator({ seed: 7, now: 0 });
    let blinks = 0;
    const ears = [];
    for (let t = 0; t <= 60000; t += 100) {
      const reading = simulator.advance(t);
      if (reading.blink) blinks += 1;
      if (reading.facePresent && reading.ear !== null) ears.push(reading.ear);
    }
    expect(blinks).toBeGreaterThan(3);
    expect(ears.length).toBeGreaterThan(100);
    expect(Math.max(...ears)).toBeGreaterThan(0.2);
    expect(Math.min(...ears)).toBeLessThan(0.12);
  });

  it('always marks its output as simulated', () => {
    const simulator = new DemoSimulator({ now: 0 });
    expect(simulator.advance(1000).simulated).toBe(true);
  });

  it('occasionally reports a lost face', () => {
    const simulator = new DemoSimulator({ seed: 3, now: 0 });
    let lost = 0;
    for (let t = 0; t <= 120000; t += 100) {
      if (!simulator.advance(t).facePresent) lost += 1;
    }
    expect(lost).toBeGreaterThan(0);
  });
});

describe('createDemoHistory', () => {
  const now = new Date(2026, 4, 10, 12, 0, 0).getTime();
  const history = createDemoHistory({ now, days: 7, seed: 11 });

  it('creates clearly labelled simulated sessions', () => {
    expect(history.sessions.length).toBeGreaterThan(0);
    history.sessions.forEach((session) => {
      expect(session.mode).toBe('demo');
      expect(session.simulated).toBe(true);
      expect(session.endedAt).toBeLessThanOrEqual(now);
      expect(session.averageBlinkRate).toBeGreaterThan(0);
      expect(Array.isArray(session.series)).toBe(true);
    });
  });

  it('creates break outcomes with simulated flags', () => {
    expect(history.breaks.length).toBeGreaterThan(0);
    history.breaks.forEach((entry) => {
      expect(entry.simulated).toBe(true);
      expect(['completed', 'postponed', 'skipped']).toContain(entry.status);
    });
  });

  it('includes at least one completed break for the charts', () => {
    expect(history.breaks.some((entry) => entry.status === 'completed')).toBe(true);
  });
});
