import { MAX_STORED_SESSIONS, STORAGE_KEYS } from './constants.js';
import { sanitizeSettings } from './settingsSchema.js';

const ALL_KEYS = Object.values(STORAGE_KEYS);

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeSession(record) {
  if (!record || typeof record !== 'object') return null;
  const startedAt = Number(record.startedAt);
  const endedAt = Number(record.endedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return null;

  const monitoredMs = Math.min(Math.max(Number(record.monitoredMs) || 0, 0), Math.max(endedAt - startedAt, 0) || 0);
  return {
    id: typeof record.id === 'string' ? record.id : `session-${startedAt}`,
    mode: record.mode === 'demo' ? 'demo' : 'live',
    simulated: record.mode === 'demo' || record.simulated === true,
    startedAt,
    endedAt,
    durationMs: Math.max(0, Number(record.durationMs) || endedAt - startedAt),
    monitoredMs,
    blinkCount: Math.max(0, Math.round(Number(record.blinkCount) || 0)),
    averageBlinkRate: Math.max(0, Number(record.averageBlinkRate) || 0),
    peakBlinkRate: Math.max(0, Number(record.peakBlinkRate) || 0),
    lowestBlinkRate:
      record.lowestBlinkRate === null || record.lowestBlinkRate === undefined
        ? null
        : Math.max(0, Number(record.lowestBlinkRate) || 0),
    calibration: record.calibration ?? null,
    series: Array.isArray(record.series)
      ? record.series
          .filter((point) => point && Number.isFinite(Number(point.t)) && Number.isFinite(Number(point.rate)))
          .slice(-240)
          .map((point) => ({
            t: Number(point.t),
            rate: Number(point.rate),
            blinks: Math.max(0, Math.round(Number(point.blinks) || 0)),
          }))
      : [],
  };
}

function normalizeBreak(record) {
  if (!record || typeof record !== 'object') return null;
  const dueAt = Number(record.dueAt);
  if (!Number.isFinite(dueAt)) return null;
  const status = ['completed', 'postponed', 'skipped'].includes(record.status) ? record.status : 'completed';
  return {
    id: typeof record.id === 'string' ? record.id : `break-${dueAt}`,
    dueAt,
    resolvedAt: Number(record.resolvedAt) || dueAt,
    status,
    durationSec: Math.max(0, Number(record.durationSec) || 0),
    snoozes: Math.max(0, Number(record.snoozes) || 0),
    simulated: record.simulated === true,
  };
}

/**
 * Thin repository over a Storage-like object. Injecting the storage makes the
 * persistence layer testable without a browser.
 */
export function createStore(storage) {
  function read(key, fallback) {
    try {
      return safeParse(storage.getItem(key), fallback);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('[blinksync] Could not persist data:', error?.message ?? error);
      return false;
    }
  }

  function getSettings() {
    return sanitizeSettings(read(STORAGE_KEYS.settings, null));
  }

  function saveSettings(settings) {
    const sanitized = sanitizeSettings(settings);
    write(STORAGE_KEYS.settings, sanitized);
    return sanitized;
  }

  function readSessionList(key) {
    const list = read(key, []);
    if (!Array.isArray(list)) return [];
    return list
      .map(normalizeSession)
      .filter(Boolean)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, MAX_STORED_SESSIONS);
  }

  function getSessions(mode = 'live') {
    return readSessionList(mode === 'demo' ? STORAGE_KEYS.demoSessions : STORAGE_KEYS.sessions);
  }

  function upsertSession(record) {
    const normalized = normalizeSession(record);
    if (!normalized) return false;
    const key = normalized.mode === 'demo' ? STORAGE_KEYS.demoSessions : STORAGE_KEYS.sessions;
    const sessions = readSessionList(key);
    const index = sessions.findIndex((session) => session.id === normalized.id);
    if (index >= 0) sessions[index] = normalized;
    else sessions.unshift(normalized);
    sessions.sort((a, b) => b.startedAt - a.startedAt);
    return write(key, sessions.slice(0, MAX_STORED_SESSIONS));
  }

  function getBreaks() {
    const list = read(STORAGE_KEYS.breaks, []);
    if (!Array.isArray(list)) return [];
    return list
      .map(normalizeBreak)
      .filter(Boolean)
      .sort((a, b) => b.resolvedAt - a.resolvedAt)
      .slice(0, 500);
  }

  function addBreak(record) {
    const normalized = normalizeBreak(record);
    if (!normalized) return false;
    const breaks = getBreaks();
    breaks.unshift(normalized);
    return write(STORAGE_KEYS.breaks, breaks.slice(0, 500));
  }

  function getAchievements() {
    const value = read(STORAGE_KEYS.achievements, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function saveAchievements(map) {
    return write(STORAGE_KEYS.achievements, map && typeof map === 'object' ? map : {});
  }

  function resetStats() {
    let ok = true;
    ok = write(STORAGE_KEYS.sessions, []) && ok;
    ok = write(STORAGE_KEYS.demoSessions, []) && ok;
    ok = write(STORAGE_KEYS.breaks, []) && ok;
    ok = write(STORAGE_KEYS.achievements, {}) && ok;
    return ok;
  }

  function clearDemoData() {
    const ok = write(STORAGE_KEYS.demoSessions, []);
    const breaks = getBreaks().filter((entry) => !entry.simulated);
    return write(STORAGE_KEYS.breaks, breaks) && ok;
  }

  function clearAll() {
    try {
      ALL_KEYS.forEach((key) => storage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('[blinksync] Could not clear data:', error?.message ?? error);
      return false;
    }
  }

  function exportData() {
    return {
      app: 'BlinkSync',
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      sessions: getSessions('live'),
      demoSessions: getSessions('demo'),
      breaks: getBreaks(),
      achievements: getAchievements(),
    };
  }

  function sizeInBytes() {
    try {
      return ALL_KEYS.reduce((total, key) => total + (storage.getItem(key)?.length ?? 0), 0) * 2;
    } catch {
      return 0;
    }
  }

  return {
    getSettings,
    saveSettings,
    getSessions,
    upsertSession,
    getBreaks,
    addBreak,
    getAchievements,
    saveAchievements,
    resetStats,
    clearDemoData,
    clearAll,
    exportData,
    sizeInBytes,
  };
}

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function resolveStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return createMemoryStorage();
  try {
    const probe = '__blinksync_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    console.warn('[blinksync] localStorage unavailable — data will not persist in this browser mode.');
    return createMemoryStorage();
  }
}

export const store = createStore(resolveStorage());
