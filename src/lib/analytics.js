import { PERIODS } from './constants.js';

export function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function dayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function periodConfig(period) {
  return PERIODS.find((entry) => entry.id === period) ?? PERIODS[1];
}

/** Inclusive start of day for the selected period. */
export function periodRange(period, now = Date.now()) {
  const config = periodConfig(period);
  const todayStart = startOfDay(now);
  const from = new Date(todayStart);
  from.setDate(from.getDate() - (config.days - 1));
  return { from: from.getTime(), to: now, days: config.days };
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function labelFor(date, days) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(days <= 2 ? {} : {}),
  });
}

function emptyDay(date, index, days) {
  return {
    key: dayKey(date.getTime()),
    label: days === 1 ? 'Today' : labelFor(date, days),
    shortLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
    date: date.getTime(),
    sessionCount: 0,
    monitoredMs: 0,
    blinkCount: 0,
    averageBlinkRate: 0,
    breaksCompleted: 0,
    breaksDue: 0,
    index,
  };
}

function buildDays(from, days) {
  const buckets = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  for (let index = 0; index < days; index += 1) {
    buckets.push(emptyDay(cursor, index, days));
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

/**
 * Builds every dataset the analytics screens need. All values are derived from
 * stored sessions and break events — nothing is invented.
 */
export function buildAnalytics({ sessions = [], breaks = [], period = '7d', now = Date.now() } = {}) {
  const { from, to, days: dayCount } = periodRange(period, now);
  const days = buildDays(from, dayCount);
  const byKey = new Map(days.map((day) => [day.key, day]));

  // The caller decides which data source to chart (real sessions or clearly
  // labelled demo sessions); this function only filters by time range.
  const inRange = sessions.filter(
    (session) => Number.isFinite(session.startedAt) && session.startedAt >= from && session.startedAt <= to,
  );

  let totalBlinkCount = 0;
  let totalMonitoredMs = 0;
  let longestSessionMs = 0;
  let weightedRate = 0;

  inRange.forEach((session) => {
    const key = dayKey(session.startedAt);
    const bucket = byKey.get(key);
    const blinkCount = Math.max(0, Number(session.blinkCount) || 0);
    const monitoredMs = Math.max(0, Number(session.monitoredMs) || 0);
    totalBlinkCount += blinkCount;
    totalMonitoredMs += monitoredMs;
    longestSessionMs = Math.max(longestSessionMs, Number(session.endedAt) - Number(session.startedAt) || 0);
    weightedRate += monitoredMs * (Number(session.averageBlinkRate) || 0);

    if (!bucket) return;
    bucket.sessionCount += 1;
    bucket.monitoredMs += monitoredMs;
    bucket.blinkCount += blinkCount;
  });

  days.forEach((day) => {
    day.averageBlinkRate = day.monitoredMs > 0 ? round(day.blinkCount / (day.monitoredMs / 60000)) : 0;
    day.monitoredMin = round(day.monitoredMs / 60000, 0);
  });

  const rangeBreaks = breaks.filter(
    (entry) => Number.isFinite(entry.dueAt) && entry.dueAt >= from && entry.dueAt <= to,
  );

  let breaksCompleted = 0;
  rangeBreaks.forEach((entry) => {
    const bucket = byKey.get(dayKey(entry.resolvedAt ?? entry.dueAt));
    const completed = entry.status === 'completed';
    if (completed) breaksCompleted += 1;
    if (!bucket) return;
    bucket.breaksDue += 1;
    if (completed) bucket.breaksCompleted += 1;
  });

  const averageBlinkRate = totalMonitoredMs > 0 ? round(totalBlinkCount / (totalMonitoredMs / 60000)) : 0;

  // Chart 1: intraday timeline when looking at today, otherwise daily volume.
  let activity = [];
  let activityUnit = 'blinks';
  let activityTitle = 'Blink activity';
  const latestSession = [...inRange].sort((a, b) => b.startedAt - a.startedAt)[0];

  if (period === 'today' && latestSession?.series?.length) {
    activityUnit = 'timeline';
    activityTitle = 'Blink rate through your last session';
    let previousBlinks = 0;
    activity = latestSession.series.map((point) => {
      const delta = Math.max(0, point.blinks - previousBlinks);
      previousBlinks = point.blinks;
      return {
        label: `${Math.round(point.t / 60)}m`,
        rate: round(point.rate),
        blinks: delta,
        total: point.blinks,
      };
    });
  } else {
    activity = days.map((day) => ({
      label: day.label,
      blinks: day.blinkCount,
      rate: day.averageBlinkRate,
      minutes: day.monitoredMin,
    }));
  }

  const rateTrend = days.map((day) => ({
    label: day.label,
    rate: day.averageBlinkRate,
    minutes: day.monitoredMin,
  }));

  const sessionBars = days.map((day) => ({
    label: day.label,
    sessions: day.sessionCount,
    minutes: day.monitoredMin,
  }));

  const breakBars = days.map((day) => ({
    label: day.label,
    completed: day.breaksCompleted,
    due: day.breaksDue,
  }));

  const bestDay = [...days].reduce(
    (best, day) => (day.blinkCount > (best?.blinkCount ?? -1) ? day : best),
    null,
  );

  const breakCompletionRate = rangeBreaks.length > 0 ? breaksCompleted / rangeBreaks.length : 0;

  return {
    period,
    from,
    to,
    days: dayCount,
    buckets: days,
    activity,
    activityUnit,
    activityTitle,
    rateTrend,
    sessionBars,
    breakBars,
    latestSession: latestSession ?? null,
    empty: inRange.length === 0,
    totals: {
      sessions: inRange.length,
      monitoredMs: totalMonitoredMs,
      blinkCount: totalBlinkCount,
      averageBlinkRate,
      weightedBlinkRate: totalMonitoredMs > 0 ? round(weightedRate / totalMonitoredMs) : 0,
      breaksCompleted,
      breaksDue: rangeBreaks.length,
      breakCompletionRate,
      longestSessionMs,
      averageSessionMs: inRange.length > 0 ? totalMonitoredMs / inRange.length : 0,
      bestDayLabel: bestDay && bestDay.blinkCount > 0 ? bestDay.label : null,
    },
  };
}

/** Distinct local days that contain at least one completed live session. */
export function activeDayCount(sessions = []) {
  const keys = new Set();
  sessions.forEach((session) => {
    if (Number.isFinite(session.startedAt) && (session.monitoredMs ?? 0) > 0) {
      keys.add(dayKey(session.startedAt));
    }
  });
  return keys.size;
}

/** Longest run of consecutive days with a session, ending today or yesterday. */
export function dayStreak(sessions = [], now = Date.now()) {
  const keys = new Set(
    sessions
      .filter((session) => Number.isFinite(session.startedAt) && (session.monitoredMs ?? 0) > 0)
      .map((session) => dayKey(session.startedAt)),
  );
  if (keys.size === 0) return 0;

  let streak = 0;
  const cursor = new Date(now);
  // A streak is still alive if the last activity was yesterday.
  if (!keys.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (keys.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
