import { describe, expect, it } from 'vitest';
import { BlinkReminderEngine, reminderConfigFor } from './reminderEngine.js';

const base = {
  facePresent: true,
  enabled: true,
  sessionStartedAt: 0,
  observedMs: 60000,
  minObservedMs: 45000,
};

describe('BlinkReminderEngine', () => {
  it('fires when the rate stays below the threshold', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12, cooldownMs: 180000 });
    const nudge = engine.evaluate({ ...base, now: 60000, rate: 6 });
    expect(nudge).not.toBeNull();
    expect(nudge.message).toMatch(/[Bb]link|eyes|break/);
  });

  it('does not fire above the threshold', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12 });
    expect(engine.evaluate({ ...base, now: 60000, rate: 14 })).toBeNull();
  });

  it('respects the cooldown between nudges', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12, cooldownMs: 180000 });
    expect(engine.evaluate({ ...base, now: 60000, rate: 5 })).not.toBeNull();
    expect(engine.evaluate({ ...base, now: 120000, rate: 5 })).toBeNull();
    expect(engine.evaluate({ ...base, now: 250000, rate: 5 })).not.toBeNull();
  });

  it('rotates reminder messages', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12, cooldownMs: 0, messages: ['one', 'two'] });
    const first = engine.evaluate({ ...base, now: 60000, rate: 5 });
    const second = engine.evaluate({ ...base, now: 61000, rate: 5 });
    expect(first.message).toBe('one');
    expect(second.message).toBe('two');
  });

  it('waits for the warmup period', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12, warmupMs: 45000 });
    expect(engine.evaluate({ ...base, now: 20000, rate: 4, observedMs: 20000 })).toBeNull();
    expect(
      engine.evaluate({ ...base, now: 20000, rate: 4, observedMs: 60000, sessionStartedAt: 0, minObservedMs: 0 }),
    ).toBeNull();
  });

  it('never fires without a face or when disabled', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12 });
    expect(engine.evaluate({ ...base, now: 60000, rate: 3, facePresent: false })).toBeNull();
    expect(engine.evaluate({ ...base, now: 60000, rate: 3, enabled: false })).toBeNull();
  });

  it('maps sensitivity presets to thresholds and cooldowns', () => {
    expect(reminderConfigFor('gentle').thresholdPerMinute).toBe(8);
    expect(reminderConfigFor('balanced').cooldownMs).toBe(180000);
    expect(reminderConfigFor('attentive').thresholdPerMinute).toBe(16);
    expect(reminderConfigFor('unknown').thresholdPerMinute).toBe(12);
  });

  it('reconfigures and resets', () => {
    const engine = new BlinkReminderEngine({ thresholdPerMinute: 12, cooldownMs: 0 });
    engine.configure({ thresholdPerMinute: 4 });
    expect(engine.evaluate({ ...base, now: 60000, rate: 5 })).toBeNull();
    engine.reset();
    expect(engine.lastDeliveredAt).toBeNull();
  });
});
