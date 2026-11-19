import { describe, expect, it } from 'vitest';
import { calibrationLabel, sanitizeSettings } from './settingsSchema.js';

describe('sanitizeSettings', () => {
  it('returns safe defaults for null or non-object input', () => {
    expect(sanitizeSettings(null).theme).toBe('dark');
    expect(sanitizeSettings('nope').breakIntervalMin).toBe(20);
    expect(sanitizeSettings([]).targetFps).toBe(15);
  });

  it('clamps numeric ranges', () => {
    const settings = sanitizeSettings({
      targetFps: 200,
      blinkSensitivity: -3,
      breakIntervalMin: 0,
      breakDurationSec: 9999,
      snoozeMin: 0,
      comfortIntensity: 12,
      soundVolume: -1,
    });
    expect(settings.targetFps).toBe(30);
    expect(settings.blinkSensitivity).toBe(0);
    expect(settings.breakIntervalMin).toBe(1);
    expect(settings.breakDurationSec).toBe(300);
    expect(settings.snoozeMin).toBe(1);
    expect(settings.comfortIntensity).toBe(0.85);
    expect(settings.soundVolume).toBe(0);
  });

  it('coerces booleans and falls back for invalid enums', () => {
    const settings = sanitizeSettings({
      theme: 'neon',
      reminderSensitivity: 'extreme',
      blinkReminders: 'yes',
      breakReminders: false,
    });
    expect(settings.theme).toBe('dark');
    expect(settings.reminderSensitivity).toBe('balanced');
    expect(settings.blinkReminders).toBe(true);
    expect(settings.breakReminders).toBe(false);
  });

  it('validates calibration objects', () => {
    expect(sanitizeSettings({ calibration: { openBaseline: 0.31, sampleCount: 40, updatedAt: 1000 } }).calibration).toEqual({
      openBaseline: 0.31,
      sampleCount: 40,
      updatedAt: 1000,
      source: 'guided',
    });
    expect(sanitizeSettings({ calibration: { openBaseline: 4 } }).calibration).toBeNull();
    expect(sanitizeSettings({ calibration: { openBaseline: 'x' } }).calibration).toBeNull();
    expect(sanitizeSettings({ calibration: null }).calibration).toBeNull();
  });

  it('keeps the camera id only when it is a string', () => {
    expect(sanitizeSettings({ cameraId: 'abc' }).cameraId).toBe('abc');
    expect(sanitizeSettings({ cameraId: 42 }).cameraId).toBe('');
  });

  it('produces a readable calibration label', () => {
    expect(calibrationLabel(null)).toBe('Not calibrated');
    expect(calibrationLabel({ openBaseline: 0.3, source: 'manual' })).toBe('Manual baseline');
    expect(calibrationLabel({ openBaseline: 0.3 })).toBe('Personal calibration');
  });
});
