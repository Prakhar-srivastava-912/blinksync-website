import { describe, expect, it } from 'vitest';
import { CalibrationCollector } from './calibration.js';

describe('CalibrationCollector', () => {
  it('produces a median baseline after the window', () => {
    const collector = new CalibrationCollector({ durationMs: 4000, minSamples: 5 });
    collector.start(0);
    [0.28, 0.3, 0.29, 0.31, 0.3, 0.29].forEach((ear, index) => collector.add(ear, index * 500));
    expect(collector.isComplete(4000)).toBe(true);
    const result = collector.result(4000);
    expect(result.openBaseline).toBeCloseTo(0.295, 3);
    expect(result.sampleCount).toBe(6);
    expect(result.source).toBe('guided');
  });

  it('requires the minimum sample count before completing', () => {
    const collector = new CalibrationCollector({ durationMs: 1000, minSamples: 8 });
    collector.start(0);
    collector.add(0.3, 200);
    collector.add(0.3, 400);
    expect(collector.progress(1000)).toBe(1);
    expect(collector.isComplete(1000)).toBe(false);
    expect(collector.result(1000)).toBeNull();
  });

  it('ignores invalid and clearly blinking samples', () => {
    const collector = new CalibrationCollector({ durationMs: 2000, minSamples: 2 });
    collector.start(0);
    collector.add(0.3, 100);
    collector.add(Number.NaN, 200);
    collector.add(0.02, 300);
    collector.add(-0.1, 400);
    expect(collector.samples).toHaveLength(1);
  });

  it('reports progress and supports cancellation', () => {
    const collector = new CalibrationCollector({ durationMs: 1000 });
    collector.start(1000);
    expect(collector.progress(1500)).toBeCloseTo(0.5);
    collector.cancel();
    expect(collector.active).toBe(false);
    expect(collector.result(2000)).toBeNull();
  });

  it('rejects a baseline that is implausibly low', () => {
    const collector = new CalibrationCollector({ durationMs: 1000, minSamples: 2 });
    collector.start(0);
    collector.add(0.02, 100);
    collector.add(0.03, 200);
    expect(collector.result(1000)).toBeNull();
  });
});
