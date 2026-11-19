import { describe, expect, it } from 'vitest';
import { activeDayCount, buildAnalytics, dayKey, dayStreak, periodRange, startOfDay } from './analytics.js';

const NOW = new Date(2026, 4, 10, 18, 0, 0).getTime(); // 10 May 2026, local time
const DAY = 86400000;

const sessions = [
  {
    id: 'today-live',
    mode: 'live',
    startedAt: NOW - 3600000,
    endedAt: NOW - 3000000,
    durationMs: 600000,
    monitoredMs: 300000,
    blinkCount: 60,
    averageBlinkRate: 12,
    series: [
      { t: 30, rate: 10, blinks: 10 },
      { t: 60, rate: 14, blinks: 24 },
    ],
  },
  {
    id: 'yesterday-live',
    mode: 'live',
    startedAt: NOW - DAY - 3600000,
    endedAt: NOW - DAY - 3000000,
    durationMs: 600000,
    monitoredMs: 120000,
    blinkCount: 18,
    averageBlinkRate: 9,
    series: [],
  },
  {
    id: 'demo',
    mode: 'demo',
    startedAt: NOW - 1000,
    endedAt: NOW,
    durationMs: 1000,
    monitoredMs: 1000,
    blinkCount: 999,
    averageBlinkRate: 999,
    series: [],
  },
];

const liveSessions = sessions.filter((session) => session.mode === 'live');

const breaks = [
  { id: 'b1', dueAt: NOW - 2000000, resolvedAt: NOW - 1980000, status: 'completed', durationSec: 20 },
  { id: 'b2', dueAt: NOW - 1900000, resolvedAt: NOW - 1890000, status: 'postponed', durationSec: 0 },
  { id: 'b3', dueAt: NOW - DAY, resolvedAt: NOW - DAY + 20000, status: 'completed', durationSec: 20 },
];

describe('period helpers', () => {
  it('starts ranges at local midnight', () => {
    const { from, days } = periodRange('7d', NOW);
    expect(days).toBe(7);
    expect(from).toBe(startOfDay(NOW - 6 * DAY));
  });

  it('creates stable day keys', () => {
    expect(dayKey(NOW)).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(dayKey(NOW)).toBe(dayKey(NOW - 60000));
  });
});

describe('buildAnalytics', () => {
  const analytics = buildAnalytics({ sessions: liveSessions, breaks, period: '7d', now: NOW });

  it('aggregates the sessions it is given', () => {
    expect(analytics.totals.sessions).toBe(2);
    expect(analytics.totals.blinkCount).toBe(78);
    expect(analytics.totals.monitoredMs).toBe(420000);
  });

  it('weights the average rate by monitored time', () => {
    // 78 blinks over 7 monitored minutes.
    expect(analytics.totals.averageBlinkRate).toBeCloseTo(11.1, 1);
  });

  it('counts break outcomes and completion rate', () => {
    expect(analytics.totals.breaksDue).toBe(3);
    expect(analytics.totals.breaksCompleted).toBe(2);
    expect(analytics.totals.breakCompletionRate).toBeCloseTo(2 / 3, 5);
  });

  it('buckets sessions and breaks per local day', () => {
    const todayBucket = analytics.buckets.find((bucket) => bucket.key === dayKey(NOW));
    expect(todayBucket.sessionCount).toBe(1);
    expect(todayBucket.blinkCount).toBe(60);
    expect(todayBucket.breaksDue).toBe(2);
    expect(todayBucket.breaksCompleted).toBe(1);

    const yesterdayBucket = analytics.buckets.find((bucket) => bucket.key === dayKey(NOW - DAY));
    expect(yesterdayBucket.sessionCount).toBe(1);
  });

  it('charts demo sessions when they are passed explicitly', () => {
    const demoOnly = buildAnalytics({
      sessions: sessions.filter((session) => session.mode === 'demo'),
      breaks: [],
      period: 'today',
      now: NOW,
    });
    expect(demoOnly.totals.sessions).toBe(1);
    expect(demoOnly.totals.blinkCount).toBe(999);
  });

  it('uses the intraday series for the today period', () => {
    const today = buildAnalytics({ sessions: liveSessions, breaks, period: 'today', now: NOW });
    expect(today.activityUnit).toBe('timeline');
    expect(today.activity).toHaveLength(2);
    expect(today.activity[1].blinks).toBe(14);
    expect(today.activity[1].rate).toBe(14);
  });

  it('uses daily buckets for longer periods', () => {
    expect(analytics.activityUnit).toBe('blinks');
    expect(analytics.activity).toHaveLength(7);
    expect(analytics.sessionBars).toHaveLength(7);
    expect(analytics.breakBars).toHaveLength(7);
    expect(analytics.rateTrend).toHaveLength(7);
  });

  it('reports an empty period honestly', () => {
    const empty = buildAnalytics({ sessions: [], breaks: [], period: '30d', now: NOW });
    expect(empty.empty).toBe(true);
    expect(empty.totals.sessions).toBe(0);
    expect(empty.totals.breakCompletionRate).toBe(0);
    expect(empty.totals.bestDayLabel).toBeNull();
  });

  it('excludes sessions outside the selected range', () => {
    const old = [
      {
        id: 'old',
        mode: 'live',
        startedAt: NOW - 40 * DAY,
        endedAt: NOW - 40 * DAY + 600000,
        durationMs: 600000,
        monitoredMs: 600000,
        blinkCount: 100,
        averageBlinkRate: 10,
        series: [],
      },
    ];
    const result = buildAnalytics({ sessions: old, breaks: [], period: '7d', now: NOW });
    expect(result.totals.sessions).toBe(0);
    expect(result.empty).toBe(true);
  });
});

describe('streaks and active days', () => {
  it('counts distinct active days', () => {
    expect(activeDayCount(sessions)).toBe(2);
    expect(activeDayCount([{ startedAt: NOW, monitoredMs: 0 }])).toBe(0);
  });

  it('computes a streak ending today', () => {
    const streakSessions = [
      { startedAt: NOW, monitoredMs: 5000 },
      { startedAt: NOW - DAY, monitoredMs: 5000 },
      { startedAt: NOW - 2 * DAY, monitoredMs: 5000 },
    ];
    expect(dayStreak(streakSessions, NOW)).toBe(3);
  });

  it('keeps a streak alive when the last session was yesterday', () => {
    const streakSessions = [
      { startedAt: NOW - DAY, monitoredMs: 5000 },
      { startedAt: NOW - 2 * DAY, monitoredMs: 5000 },
    ];
    expect(dayStreak(streakSessions, NOW)).toBe(2);
  });

  it('breaks the streak when a day is missing', () => {
    const streakSessions = [
      { startedAt: NOW, monitoredMs: 5000 },
      { startedAt: NOW - 3 * DAY, monitoredMs: 5000 },
    ];
    expect(dayStreak(streakSessions, NOW)).toBe(1);
  });

  it('returns zero without sessions', () => {
    expect(dayStreak([], NOW)).toBe(0);
  });
});
