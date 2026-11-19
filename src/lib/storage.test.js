import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from './storage.js';
import { STORAGE_KEYS } from './constants.js';

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
    _map: map,
  };
}

const session = (id, startedAt, mode = 'live') => ({
  id,
  mode,
  startedAt,
  endedAt: startedAt + 120000,
  durationMs: 120000,
  monitoredMs: 60000,
  blinkCount: 14,
  averageBlinkRate: 14,
  series: [{ t: 30, rate: 12, blinks: 6 }],
});

describe('createStore', () => {
  let storage;
  let store;

  beforeEach(() => {
    storage = createMemoryStorage();
    store = createStore(storage);
  });

  it('returns defaults for an empty storage', () => {
    const settings = store.getSettings();
    expect(settings.theme).toBe('dark');
    expect(settings.blinkSensitivity).toBeCloseTo(0.55);
  });

  it('persists sanitised settings', () => {
    store.saveSettings({ theme: 'light', blinkSensitivity: 5, breakIntervalMin: -2 });
    const settings = store.getSettings();
    expect(settings.theme).toBe('light');
    expect(settings.blinkSensitivity).toBe(1);
    expect(settings.breakIntervalMin).toBe(1);
  });

  it('survives corrupted JSON without throwing', () => {
    storage.setItem(STORAGE_KEYS.sessions, '{not valid json');
    expect(store.getSessions('live')).toEqual([]);
    expect(store.getSettings().theme).toBe('dark');
  });

  it('upserts sessions by id and keeps newest first', () => {
    store.upsertSession(session('a', 1000));
    store.upsertSession(session('b', 5000));
    store.upsertSession({ ...session('a', 1000), blinkCount: 99 });

    const sessions = store.getSessions('live');
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('b');
    expect(sessions.find((entry) => entry.id === 'a').blinkCount).toBe(99);
  });

  it('keeps demo sessions separate from real sessions', () => {
    store.upsertSession(session('real', 1000, 'live'));
    store.upsertSession(session('demo', 2000, 'demo'));

    expect(store.getSessions('live')).toHaveLength(1);
    expect(store.getSessions('demo')).toHaveLength(1);
    expect(store.getSessions('demo')[0].simulated).toBe(true);
  });

  it('ignores invalid session records', () => {
    expect(store.upsertSession({ id: 'broken' })).toBe(false);
    expect(store.getSessions('live')).toEqual([]);
  });

  it('normalises break outcomes', () => {
    store.addBreak({ id: 'b1', dueAt: 1000, resolvedAt: 2000, status: 'completed', durationSec: 20 });
    store.addBreak({ id: 'b2', dueAt: 'nope' });
    const breaks = store.getBreaks();
    expect(breaks).toHaveLength(1);
    expect(breaks[0].status).toBe('completed');
    expect(breaks[0].durationSec).toBe(20);
  });

  it('exports everything it stores', () => {
    store.saveSettings({ theme: 'light' });
    store.upsertSession(session('real', 1000));
    store.addBreak({ dueAt: 1000, status: 'completed' });
    store.saveAchievements({ 'first-session': 123 });

    const payload = store.exportData();
    expect(payload.app).toBe('BlinkSync');
    expect(payload.settings.theme).toBe('light');
    expect(payload.sessions).toHaveLength(1);
    expect(payload.breaks).toHaveLength(1);
    expect(payload.achievements['first-session']).toBe(123);
    expect(typeof payload.exportedAt).toBe('string');
  });

  it('resets statistics but keeps settings', () => {
    store.saveSettings({ theme: 'light' });
    store.upsertSession(session('real', 1000));
    store.upsertSession(session('demo', 1000, 'demo'));
    store.addBreak({ dueAt: 1000, status: 'completed' });
    store.saveAchievements({ x: 1 });

    store.resetStats();
    expect(store.getSessions('live')).toEqual([]);
    expect(store.getSessions('demo')).toEqual([]);
    expect(store.getBreaks()).toEqual([]);
    expect(store.getAchievements()).toEqual({});
    expect(store.getSettings().theme).toBe('light');
  });

  it('clears demo data without touching real data', () => {
    store.upsertSession(session('real', 1000));
    store.upsertSession(session('demo', 2000, 'demo'));
    store.addBreak({ dueAt: 1000, status: 'completed', simulated: true });
    store.addBreak({ dueAt: 2000, status: 'completed', simulated: false });

    store.clearDemoData();
    expect(store.getSessions('demo')).toEqual([]);
    expect(store.getSessions('live')).toHaveLength(1);
    expect(store.getBreaks()).toHaveLength(1);
    expect(store.getBreaks()[0].simulated).toBe(false);
  });

  it('deletes every key on clearAll', () => {
    store.saveSettings({ theme: 'light' });
    store.upsertSession(session('real', 1000));
    store.clearAll();
    expect(storage._map.size).toBe(0);
    expect(store.getSettings().theme).toBe('dark');
  });

  it('reports an approximate storage size', () => {
    store.upsertSession(session('real', 1000));
    expect(store.sizeInBytes()).toBeGreaterThan(10);
  });
});
