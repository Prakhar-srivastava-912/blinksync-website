import { DEFAULT_SETTINGS, REMINDER_PRESETS } from './constants.js';

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clampInt(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeCalibration(value) {
  if (!value || typeof value !== 'object') return null;
  const baseline = Number(value.openBaseline);
  if (!Number.isFinite(baseline) || baseline < 0.02 || baseline > 1.2) return null;
  return {
    openBaseline: Math.round(baseline * 1000) / 1000,
    sampleCount: clampInt(value.sampleCount, 0, 100000, 0),
    updatedAt: clampNumber(value.updatedAt, 0, Date.now() + 86400000, Date.now()),
    source: value.source === 'manual' ? 'manual' : 'guided',
  };
}

/**
 * Validates and normalises persisted settings so a corrupted or hand-edited
 * localStorage entry can never break the app.
 */
export function sanitizeSettings(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const defaults = DEFAULT_SETTINGS;

  return {
    version: 1,
    theme: raw.theme === 'light' ? 'light' : 'dark',
    onboardingComplete: asBoolean(raw.onboardingComplete, defaults.onboardingComplete),
    monitoringEnabled: asBoolean(raw.monitoringEnabled, defaults.monitoringEnabled),
    cameraId: typeof raw.cameraId === 'string' ? raw.cameraId : defaults.cameraId,
    showLandmarks: asBoolean(raw.showLandmarks, defaults.showLandmarks),
    targetFps: clampInt(raw.targetFps, 5, 30, defaults.targetFps),
    blinkSensitivity: clampNumber(raw.blinkSensitivity, 0, 1, defaults.blinkSensitivity),
    calibration: sanitizeCalibration(raw.calibration),
    blinkReminders: asBoolean(raw.blinkReminders, defaults.blinkReminders),
    reminderSensitivity: REMINDER_PRESETS[raw.reminderSensitivity]
      ? raw.reminderSensitivity
      : defaults.reminderSensitivity,
    reminderSound: asBoolean(raw.reminderSound, defaults.reminderSound),
    soundVolume: clampNumber(raw.soundVolume, 0, 1, defaults.soundVolume),
    breakReminders: asBoolean(raw.breakReminders, defaults.breakReminders),
    breakIntervalMin: clampInt(raw.breakIntervalMin, 1, 120, defaults.breakIntervalMin),
    breakDurationSec: clampInt(raw.breakDurationSec, 5, 300, defaults.breakDurationSec),
    snoozeMin: clampInt(raw.snoozeMin, 1, 60, defaults.snoozeMin),
    comfortMode: asBoolean(raw.comfortMode, defaults.comfortMode),
    comfortIntensity: clampNumber(raw.comfortIntensity, 0.05, 0.85, defaults.comfortIntensity),
    demoMode: asBoolean(raw.demoMode, defaults.demoMode),
  };
}

export function calibrationLabel(calibration) {
  if (!calibration) return 'Not calibrated';
  return calibration.source === 'manual' ? 'Manual baseline' : 'Personal calibration';
}
