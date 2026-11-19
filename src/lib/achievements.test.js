import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementStats, collectNewUnlocks, evaluateAchievements } from './achievements.js';

const NOW = new Date(2026, 4, 10, 12, 0, 0).getTime();
const DAY = 86400000;

const session = (startedAt, overrides = {}) => ({
  id: `s-${startedAt}`,
  mode: 'live',
  startedAt,
  endedAt: startedAt + 60000,
  durationMs: 60000,
  monitoredMs: 30000,
  blinkCount: 8,
  averageBlinkRate: 16,
  ...overrides,
});

const completedBreak = (id) => ({
  id,
  dueAt: NOW - 1000,
  resolvedAt: NOW,
  status: 'completed',
  durationSec: 20,
});

function evaluate(overrides = {}) {
  return evaluateAchievements({
    sessions: [],
    breaks: [],
    settings: { calibration: null },
    unlocked: {},
    now: NOW,
    ...overrides,
  });
}

const find = (list, id) => list.find((entry) => entry.id === id);

describe('evaluateAchievements', () => {
  it('starts fully locked with zero progress', () => {
    const result = evaluate();
    expect(result).toHaveLength(ACHIEVEMENTS.length);
    expect(result.every((entry) => entry.unlocked === false)).toBe(true);
    expect(achievementStats(result).earned).toBe(0);
  });

  it('unlocks the first session after three seconds of monitoring', () => {
    const short = evaluate({ sessions: [session(NOW, { monitoredMs: 2000 })] });
    expect(find(short, 'first-session').unlocked).toBe(false);

    const real = evaluate({ sessions: [session(NOW, { monitoredMs: 5000 })] });
    expect(find(real, 'first-session').unlocked).toBe(true);
    expect(find(real, 'first-session').percent).toBe(1);
  });

  it('unlocks calibration only when a baseline exists', () => {
    const before = evaluate();
    expect(find(before, 'calibrated').unlocked).toBe(false);
    const after = evaluate({ settings: { calibration: { openBaseline: 0.29 } } });
    expect(find(after, 'calibrated').unlocked).toBe(true);
  });

  it('counts completed breaks, not postponed ones', () => {
    const result = evaluate({
      breaks: [
        completedBreak('a'),
        completedBreak('b'),
        { id: 'c', dueAt: NOW, resolvedAt: NOW, status: 'postponed' },
      ],
    });
    // Progress is capped at the badge target, so the first badge shows 1/1.
    expect(find(result, 'first-break').current).toBe(1);
    expect(find(result, 'first-break').unlocked).toBe(true);
    expect(find(result, 'five-breaks').current).toBe(2);
    expect(find(result, 'five-breaks').unlocked).toBe(false);
  });

  it('tracks multi-day consistency from distinct days', () => {
    const result = evaluate({
      sessions: [session(NOW), session(NOW - DAY), session(NOW - 2 * DAY)],
    });
    expect(find(result, 'three-days').unlocked).toBe(true);
    expect(find(result, 'streak-3').unlocked).toBe(true);
  });

  it('caps displayed progress at the target', () => {
    const result = evaluate({ breaks: Array.from({ length: 9 }, (_, index) => completedBreak(String(index))) });
    const five = find(result, 'five-breaks');
    expect(five.current).toBe(5);
    expect(five.percent).toBe(1);
    expect(find(result, 'twenty-breaks').current).toBe(9);
  });

  it('rewards blink awareness from tracked blinks', () => {
    const result = evaluate({ sessions: [session(NOW, { blinkCount: 250 })] });
    expect(find(result, 'blink-aware').unlocked).toBe(true);
  });
});

describe('collectNewUnlocks', () => {
  it('persists each unlock exactly once', () => {
    const evaluated = evaluate({ sessions: [session(NOW)], breaks: [completedBreak('a')] });
    const first = collectNewUnlocks(evaluated, {}, NOW);
    expect(first.freshlyUnlocked.map((entry) => entry.id).sort()).toEqual(['first-break', 'first-session']);
    expect(first.unlocked['first-session']).toBe(NOW);

    const second = collectNewUnlocks(evaluated, first.unlocked, NOW + 1000);
    expect(second.freshlyUnlocked).toHaveLength(0);
    expect(second.unlocked).toEqual(first.unlocked);
  });

  it('does not duplicate an existing unlock timestamp', () => {
    const evaluated = evaluate({ sessions: [session(NOW)] });
    const previous = { 'first-session': 1234 };
    const result = collectNewUnlocks(evaluated, previous, NOW);
    expect(result.unlocked['first-session']).toBe(1234);
    expect(result.freshlyUnlocked).toHaveLength(0);
  });
});

describe('achievementStats', () => {
  it('summarises earned badges', () => {
    const result = evaluate({ sessions: [session(NOW)], breaks: [completedBreak('a')] });
    const stats = achievementStats(result);
    expect(stats.total).toBe(ACHIEVEMENTS.length);
    expect(stats.earned).toBe(2);
    expect(stats.percent).toBeCloseTo(2 / ACHIEVEMENTS.length, 5);
  });
});
