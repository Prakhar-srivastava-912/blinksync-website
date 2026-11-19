import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BREAK_EVENTS, BreakScheduler } from '../lib/breakTimer.js';
import { collectNewUnlocks, evaluateAchievements } from '../lib/achievements.js';
import { playChime, unlockAudio } from '../lib/audio.js';
import { createDemoHistory } from '../lib/demoSimulator.js';
import { store } from '../lib/storage.js';
import { DEFAULT_SETTINGS } from '../lib/constants.js';

const AppContext = createContext(null);

let toastId = 0;

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => store.getSettings());
  const [sessions, setSessions] = useState(() => store.getSessions('live'));
  const [demoSessions, setDemoSessions] = useState(() => store.getSessions('demo'));
  const [breaks, setBreaks] = useState(() => store.getBreaks());
  const [unlocked, setUnlocked] = useState(() => store.getAchievements());
  const [toasts, setToasts] = useState([]);
  const [breakPrompt, setBreakPrompt] = useState(null);
  const [breakPausedUntil, setBreakPausedUntil] = useState(0);
  const [breakStatus, setBreakStatus] = useState(() => new BreakScheduler().status(Date.now()));
  const [clock, setClock] = useState(() => Date.now());

  const schedulerRef = useRef(new BreakScheduler());
  const breakPromptRef = useRef(null);
  const settingsRef = useRef(settings);
  const pauseUntilRef = useRef(0);
  const timersRef = useRef(new Map());

  useEffect(() => {
    settingsRef.current = settings;
    document.documentElement.dataset.theme = settings.theme === 'light' ? 'light' : 'dark';
  }, [settings]);

  useEffect(() => {
    schedulerRef.current.configure({
      intervalMs: Math.max(60000, settings.breakIntervalMin * 60000),
      durationMs: Math.max(5000, settings.breakDurationSec * 1000),
      snoozeMs: Math.max(30000, settings.snoozeMin * 60000),
    });
  }, [settings.breakIntervalMin, settings.breakDurationSec, settings.snoozeMin]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, { tone = 'info', icon = null, duration = 4800 } = {}) => {
      toastId += 1;
      const id = toastId;
      setToasts((current) => [...current.slice(-3), { id, message, tone, icon }]);
      const timer = setTimeout(() => dismissToast(id), duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  const updateSettings = useCallback((patch) => {
    setSettings((previous) => {
      const update = typeof patch === 'function' ? patch(previous) : patch;
      const next = store.saveSettings({ ...previous, ...update });
      return next;
    });
  }, []);

  const saveSession = useCallback((record) => {
    if (!record) return false;
    const saved = store.upsertSession(record);
    if (!saved) return false;
    if (record.mode === 'demo') setDemoSessions(store.getSessions('demo'));
    else setSessions(store.getSessions('live'));
    return true;
  }, []);

  const recordBreak = useCallback(({ dueAt, status, snoozes = 0, durationSec = 0, simulated = false }) => {
    const resolvedAt = Date.now();
    const record = {
      id: `break-${dueAt}-${resolvedAt}-${Math.random().toString(36).slice(2, 6)}`,
      dueAt: Number.isFinite(dueAt) ? dueAt : resolvedAt,
      resolvedAt,
      status,
      durationSec,
      snoozes,
      simulated,
    };
    store.addBreak(record);
    setBreaks(store.getBreaks());
    return record;
  }, []);

  const closeBreakPrompt = useCallback(() => {
    breakPromptRef.current = null;
    setBreakPrompt(null);
  }, []);

  const startBreak = useCallback(() => {
    const scheduler = schedulerRef.current;
    const now = Date.now();
    if (scheduler.phase !== 'due') return false;
    const started = scheduler.startBreak(now);
    if (!started) return false;
    unlockAudio();
    const prompt = breakPromptRef.current ?? { dueAt: scheduler.pendingDueAt ?? now, snoozes: 0 };
    breakPromptRef.current = { ...prompt, running: true };
    setBreakPrompt(breakPromptRef.current);
    setBreakStatus(scheduler.status(now));
    return true;
  }, []);

  const startBreakNow = useCallback(() => {
    const scheduler = schedulerRef.current;
    const now = Date.now();
    if (scheduler.phase === 'break') return false;
    if (scheduler.phase === 'idle') scheduler.forceBreak(now);
    if (!breakPromptRef.current) {
      breakPromptRef.current = { dueAt: now, snoozes: 0 };
      setBreakPrompt(breakPromptRef.current);
    }
    return startBreak();
  }, [startBreak]);

  const snoozeBreak = useCallback(() => {
    const scheduler = schedulerRef.current;
    const now = Date.now();
    const prompt = breakPromptRef.current ?? { dueAt: now, snoozes: 0 };
    const result = scheduler.snooze(now);
    if (!result) return false;
    recordBreak({
      dueAt: result.dueAt ?? prompt.dueAt,
      status: 'postponed',
      snoozes: prompt.snoozes + 1,
      durationSec: 0,
    });
    closeBreakPrompt();
    setBreakStatus(scheduler.status(now));
    notify(`Break postponed for ${settingsRef.current.snoozeMin} minutes.`, { tone: 'info', icon: 'Clock' });
    return true;
  }, [closeBreakPrompt, notify, recordBreak]);

  const skipBreak = useCallback(() => {
    const scheduler = schedulerRef.current;
    const now = Date.now();
    const prompt = breakPromptRef.current ?? { dueAt: now, snoozes: 0 };
    const result = scheduler.skip(now);
    if (!result) return false;
    recordBreak({
      dueAt: result.dueAt ?? prompt.dueAt,
      status: 'skipped',
      snoozes: prompt.snoozes,
      durationSec: 0,
    });
    closeBreakPrompt();
    setBreakStatus(scheduler.status(now));
    notify('Break skipped. Your eyes will thank you next time.', { tone: 'info', icon: 'Info' });
    return true;
  }, [closeBreakPrompt, notify, recordBreak]);

  const endBreakEarly = useCallback(() => {
    const scheduler = schedulerRef.current;
    const now = Date.now();
    const result = scheduler.endBreak(now);
    if (!result) return false;
    const prompt = breakPromptRef.current ?? { dueAt: now, snoozes: 0 };
    recordBreak({
      dueAt: prompt.dueAt,
      status: 'skipped',
      snoozes: prompt.snoozes,
      durationSec: Math.round((now - (scheduler.breakStartedAt ?? now)) / 1000),
    });
    closeBreakPrompt();
    setBreakStatus(scheduler.status(now));
    return true;
  }, [closeBreakPrompt, recordBreak]);

  const pauseBreaks = useCallback((minutes = 30) => {
    const until = Date.now() + Math.max(1, minutes) * 60000;
    pauseUntilRef.current = until;
    setBreakPausedUntil(until);
    schedulerRef.current.clearActiveTime();
    setBreakStatus(schedulerRef.current.status(Date.now()));
    notify(`Break reminders paused for ${minutes} minutes.`, { tone: 'info', icon: 'BellOff' });
  }, [notify]);

  const resumeBreaks = useCallback(() => {
    pauseUntilRef.current = 0;
    setBreakPausedUntil(0);
    setBreakStatus(schedulerRef.current.status(Date.now()));
    notify('Break reminders resumed.', { tone: 'success', icon: 'Bell' });
  }, [notify]);

  // Single 1-second heart-beat shared by the break scheduler and all countdown UI.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setClock(now);
      const scheduler = schedulerRef.current;
      const promptOpen = breakPromptRef.current !== null;
      const paused = pauseUntilRef.current > now;
      const screenActive =
        settingsRef.current.breakReminders &&
        !paused &&
        !promptOpen &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';

      const event = scheduler.tick(now, { screenActive });

      if (event === BREAK_EVENTS.DUE) {
        const dueAt = scheduler.status(now).pendingDueAt ?? now;
        breakPromptRef.current = { dueAt, snoozes: 0 };
        setBreakPrompt(breakPromptRef.current);
        notify('Time for a 20-20-20 break. Look about 20 feet away.', {
          tone: 'break',
          icon: 'Coffee',
          duration: 8000,
        });
        if (settingsRef.current.reminderSound) {
          playChime({ volume: settingsRef.current.soundVolume, kind: 'break' });
        }
      } else if (event === BREAK_EVENTS.COMPLETE) {
        const prompt = breakPromptRef.current ?? { dueAt: now, snoozes: 0 };
        recordBreak({
          dueAt: prompt.dueAt,
          status: 'completed',
          snoozes: prompt.snoozes,
          durationSec: settingsRef.current.breakDurationSec,
        });
        closeBreakPrompt();
        notify('Break complete — nicely done. Back to it, softly.', {
          tone: 'success',
          icon: 'CheckCircle2',
          duration: 6000,
        });
        if (settingsRef.current.reminderSound) {
          playChime({ volume: settingsRef.current.soundVolume, kind: 'break' });
        }
      }

      setBreakStatus(scheduler.status(now));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [closeBreakPrompt, notify, recordBreak]);

  const achievements = useMemo(
    () =>
      evaluateAchievements({
        sessions,
        breaks: breaks.filter((entry) => !entry.simulated),
        settings,
        unlocked,
        now: clock,
      }),
    // `clock` intentionally excluded: achievements only need re-evaluation on data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, breaks, settings, unlocked],
  );

  useEffect(() => {
    const { unlocked: next, freshlyUnlocked } = collectNewUnlocks(achievements, unlocked);
    if (freshlyUnlocked.length === 0) return;
    store.saveAchievements(next);
    setUnlocked(next);
    freshlyUnlocked.forEach((achievement) => {
      notify(`Achievement unlocked — ${achievement.title}`, {
        tone: 'success',
        icon: 'Trophy',
        duration: 6500,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements]);

  const resetStats = useCallback(() => {
    store.resetStats();
    setSessions([]);
    setDemoSessions([]);
    setBreaks([]);
    setUnlocked({});
    notify('All statistics were reset. Settings were kept.', { tone: 'success', icon: 'RotateCcw' });
  }, [notify]);

  const clearDemoData = useCallback(() => {
    store.clearDemoData();
    setDemoSessions([]);
    setBreaks(store.getBreaks());
    notify('Demo data cleared.', { tone: 'info', icon: 'Trash2' });
  }, [notify]);

  const loadDemoHistory = useCallback(() => {
    const { sessions: demoRecords, breaks: demoBreaks } = createDemoHistory({ days: 7 });
    demoRecords.forEach((record) => store.upsertSession(record));
    demoBreaks.forEach((entry) => store.addBreak(entry));
    setDemoSessions(store.getSessions('demo'));
    setBreaks(store.getBreaks());
    notify('Sample demo history loaded — every value is simulated.', { tone: 'info', icon: 'Sparkles' });
  }, [notify]);

  const deleteAllData = useCallback(() => {
    store.clearAll();
    const defaults = store.saveSettings({ ...DEFAULT_SETTINGS });
    setSettings(defaults);
    setSessions([]);
    setDemoSessions([]);
    setBreaks([]);
    setUnlocked({});
    schedulerRef.current.reset();
    pauseUntilRef.current = 0;
    setBreakPausedUntil(0);
    setBreakPrompt(null);
    breakPromptRef.current = null;
    setBreakStatus(schedulerRef.current.status(Date.now()));
    notify('All local BlinkSync data was deleted.', { tone: 'success', icon: 'ShieldCheck' });
  }, [notify]);

  const exportData = useCallback(() => {
    try {
      const payload = store.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blinksync-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify('Statistics exported as JSON.', { tone: 'success', icon: 'Download' });
      return true;
    } catch {
      notify('Export failed — your browser blocked the download.', { tone: 'danger', icon: 'Info' });
      return false;
    }
  }, [notify]);

  const completeOnboarding = useCallback(() => {
    updateSettings({ onboardingComplete: true });
  }, [updateSettings]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      completeOnboarding,
      sessions,
      demoSessions,
      breaks,
      saveSession,
      recordBreak,
      achievements,
      unlocked,
      toasts,
      notify,
      dismissToast,
      breakPrompt,
      breakStatus,
      breakPausedUntil,
      startBreak,
      startBreakNow,
      snoozeBreak,
      skipBreak,
      endBreakEarly,
      pauseBreaks,
      resumeBreaks,
      resetStats,
      clearDemoData,
      loadDemoHistory,
      deleteAllData,
      exportData,
      storageBytes: store.sizeInBytes(),
    }),
    [
      settings,
      updateSettings,
      completeOnboarding,
      sessions,
      demoSessions,
      breaks,
      saveSession,
      recordBreak,
      achievements,
      unlocked,
      toasts,
      notify,
      dismissToast,
      breakPrompt,
      breakStatus,
      breakPausedUntil,
      startBreak,
      startBreakNow,
      snoozeBreak,
      skipBreak,
      endBreakEarly,
      pauseBreaks,
      resumeBreaks,
      resetStats,
      clearDemoData,
      loadDemoHistory,
      deleteAllData,
      exportData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}
