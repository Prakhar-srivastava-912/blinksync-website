import { describe, expect, it } from 'vitest';
import { BREAK_EVENTS, BreakScheduler } from './breakTimer.js';

const MINUTE = 60000;

function advance(scheduler, from, to, step = 2000) {
  let event = null;
  for (let time = from; time <= to; time += step) {
    const next = scheduler.tick(time, { screenActive: true });
    if (next) event = next;
  }
  return event;
}

describe('BreakScheduler', () => {
  it('does not become due before the interval has accumulated', () => {
    const scheduler = new BreakScheduler({ intervalMs: 20 * MINUTE, durationMs: 20000 });
    expect(advance(scheduler, 0, 10 * MINUTE)).toBeNull();
    expect(scheduler.phase).toBe('idle');
  });

  it('becomes due after the interval and only emits once', () => {
    const scheduler = new BreakScheduler({ intervalMs: 2 * MINUTE, durationMs: 20000 });
    expect(advance(scheduler, 0, 2 * MINUTE + 2000)).toBe(BREAK_EVENTS.DUE);
    expect(scheduler.status(2 * MINUTE + 4000).pendingDueAt).toBeGreaterThan(0);
    expect(advance(scheduler, 2 * MINUTE + 4000, 3 * MINUTE)).toBeNull();
    expect(scheduler.phase).toBe('due');
  });

  it('runs a full break and counts it as completed', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE, durationMs: 20000 });
    advance(scheduler, 0, MINUTE + 2000);
    expect(scheduler.startBreak(MINUTE + 3000)).toBe(BREAK_EVENTS.START);
    expect(scheduler.status(MINUTE + 4000).breakRemainingMs).toBeGreaterThan(0);
    expect(advance(scheduler, MINUTE + 4000, MINUTE + 25000)).toBe(BREAK_EVENTS.COMPLETE);
    expect(scheduler.completedBreaks).toBe(1);
    expect(scheduler.phase).toBe('idle');
    expect(scheduler.activeMs).toBe(0);
  });

  it('postpones with the configured snooze length', () => {
    const scheduler = new BreakScheduler({ intervalMs: 2 * MINUTE, durationMs: 20000, snoozeMs: 30000 });
    advance(scheduler, 0, 2 * MINUTE + 2000);
    const result = scheduler.snooze(2 * MINUTE + 3000);
    expect(result.event).toBe(BREAK_EVENTS.SNOOZE);
    expect(scheduler.status(2 * MINUTE + 3000).remainingMs).toBeLessThanOrEqual(30000);
    expect(scheduler.status(2 * MINUTE + 3000).remainingMs).toBeGreaterThan(29000);
  });

  it('skipping resets the whole interval', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE });
    advance(scheduler, 0, MINUTE + 2000);
    expect(scheduler.skip(MINUTE + 3000).event).toBe(BREAK_EVENTS.SKIP);
    expect(scheduler.activeMs).toBe(0);
    expect(scheduler.phase).toBe('idle');
  });

  it('does not accumulate time while screen tracking is inactive', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE });
    for (let time = 0; time <= 10 * MINUTE; time += 2000) {
      scheduler.tick(time, { screenActive: false });
    }
    expect(scheduler.status(10 * MINUTE).progress).toBe(0);
  });

  it('ignores long gaps when the tab was suspended', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE });
    scheduler.tick(0, { screenActive: true });
    scheduler.tick(10 * MINUTE, { screenActive: true });
    expect(scheduler.activeMs).toBeLessThanOrEqual(2000);
  });

  it('supports starting a break from the UI without a scheduled prompt', () => {
    const scheduler = new BreakScheduler({ intervalMs: 20 * MINUTE });
    expect(scheduler.forceBreak(5000)).toBe(BREAK_EVENTS.DUE);
    expect(scheduler.startBreak(5000)).toBe(BREAK_EVENTS.START);
    expect(scheduler.phase).toBe('break');
  });

  it('ends a break early without counting it as completed', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE, durationMs: 20000 });
    advance(scheduler, 0, MINUTE + 2000);
    scheduler.startBreak(MINUTE + 3000);
    const event = scheduler.endBreak(MINUTE + 8000);
    expect(event).toBe(BREAK_EVENTS.SKIP);
    expect(scheduler.completedBreaks).toBe(0);
  });

  it('clears accumulated time when reminders are disabled', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE });
    advance(scheduler, 0, 40000);
    scheduler.clearActiveTime();
    expect(scheduler.status(40000).progress).toBe(0);
  });

  it('validates configured values', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE, durationMs: 20000 });
    scheduler.configure({ intervalMs: 100, durationMs: 10, snoozeMs: 10 });
    expect(scheduler.intervalMs).toBe(MINUTE);
    expect(scheduler.durationMs).toBe(20000);
  });

  it('reports progress for the next-break ring', () => {
    const scheduler = new BreakScheduler({ intervalMs: MINUTE });
    advance(scheduler, 0, 30000);
    const status = scheduler.status(30000);
    expect(status.progress).toBeGreaterThan(0.45);
    expect(status.progress).toBeLessThan(0.6);
  });
});
