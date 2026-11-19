import { activeDayCount, dayStreak } from './analytics.js';

/**
 * Achievements deliberately reward awareness and breaks — never longer screen
 * time. Each definition exposes a pure progress function so progress can be
 * recomputed from stored data at any time.
 */
export const ACHIEVEMENTS = [
  {
    id: 'first-session',
    title: 'First Look',
    description: 'Finish your first blink monitoring session.',
    hint: 'Start monitoring and stop after at least a few seconds.',
    icon: 'ScanFace',
    tone: 'cyan',
    progress: ({ sessions }) => ({ current: sessions.filter((s) => (s.monitoredMs ?? 0) >= 3000).length, target: 1 }),
  },
  {
    id: 'calibrated',
    title: 'Perfect Fit',
    description: 'Complete personal calibration for your eyes.',
    hint: 'Run the guided calibration in Live Monitoring.',
    icon: 'Focus',
    tone: 'teal',
    progress: ({ settings }) => ({ current: settings?.calibration ? 1 : 0, target: 1 }),
  },
  {
    id: 'first-break',
    title: 'First Pause',
    description: 'Complete your first 20-20-20 eye break.',
    hint: 'Take a full 20-second break when the reminder appears.',
    icon: 'Coffee',
    tone: 'amber',
    progress: ({ completedBreaks }) => ({ current: completedBreaks, target: 1 }),
  },
  {
    id: 'five-breaks',
    title: 'Break Rhythm',
    description: 'Complete five eye breaks.',
    hint: 'Each completed countdown adds one.',
    icon: 'Wind',
    tone: 'violet',
    progress: ({ completedBreaks }) => ({ current: completedBreaks, target: 5 }),
  },
  {
    id: 'twenty-breaks',
    title: 'Rest Routine',
    description: 'Complete twenty eye breaks.',
    hint: 'Keep accepting the break reminders.',
    icon: 'Heart',
    tone: 'rose',
    progress: ({ completedBreaks }) => ({ current: completedBreaks, target: 20 }),
  },
  {
    id: 'three-days',
    title: 'Consistent Care',
    description: 'Monitor your blinks on three different days.',
    hint: 'A few mindful minutes a day is enough.',
    icon: 'CalendarDays',
    tone: 'sky',
    progress: ({ sessions }) => ({ current: activeDayCount(sessions), target: 3 }),
  },
  {
    id: 'blink-aware',
    title: 'Blink Aware',
    description: 'Track 200 blinks across your sessions.',
    hint: 'Awareness of blinking is the goal, not screen time.',
    icon: 'Eye',
    tone: 'cyan',
    progress: ({ sessions }) => ({
      current: sessions.reduce((total, session) => total + (session.blinkCount ?? 0), 0),
      target: 200,
    }),
  },
  {
    id: 'streak-3',
    title: 'Three-Day Streak',
    description: 'Check in three days in a row.',
    hint: 'A short session each day keeps the streak alive.',
    icon: 'Flame',
    tone: 'amber',
    progress: ({ sessions, now }) => ({ current: dayStreak(sessions, now), target: 3 }),
  },
];

export function evaluateAchievements({
  sessions = [],
  breaks = [],
  settings = null,
  unlocked = {},
  now = Date.now(),
} = {}) {
  const completedBreaks = breaks.filter((entry) => entry.status === 'completed').length;

  return ACHIEVEMENTS.map((definition) => {
    const raw = definition.progress({ sessions, breaks, settings, completedBreaks, now });
    const target = Math.max(1, raw.target ?? 1);
    const current = Math.min(target, Math.max(0, Math.round(raw.current ?? 0)));
    return {
      ...definition,
      current,
      target,
      percent: current / target,
      unlocked: current >= target,
      unlockedAt: unlocked?.[definition.id] ?? null,
    };
  });
}

/**
 * Persists newly earned badges, returning the updated map and the fresh ones so
 * the UI can celebrate them exactly once.
 */
export function collectNewUnlocks(evaluated, unlocked = {}, now = Date.now()) {
  const next = { ...unlocked };
  const freshlyUnlocked = [];
  evaluated.forEach((achievement) => {
    if (achievement.unlocked && !next[achievement.id]) {
      next[achievement.id] = now;
      freshlyUnlocked.push(achievement);
    }
  });
  return { unlocked: next, freshlyUnlocked };
}

export function achievementStats(evaluated) {
  const total = evaluated.length;
  const earned = evaluated.filter((achievement) => achievement.unlocked).length;
  return { total, earned, percent: total > 0 ? earned / total : 0 };
}
