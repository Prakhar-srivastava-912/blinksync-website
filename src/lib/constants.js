export const APP_NAME = 'BlinkSync';
export const APP_TAGLINE = 'Your AI-Powered Eye Care Companion';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  settings: 'blinksync.settings.v1',
  sessions: 'blinksync.sessions.v1',
  demoSessions: 'blinksync.demo-sessions.v1',
  breaks: 'blinksync.breaks.v1',
  achievements: 'blinksync.achievements.v1',
};

/** MediaPipe Face Landmarker indices used for the Eye Aspect Ratio. */
export const EYE_LANDMARKS = {
  left: { outer: 33, inner: 133, upper: [160, 158], lower: [144, 153] },
  right: { outer: 362, inner: 263, upper: [385, 387], lower: [373, 380] },
};

/** Landmarks used for face size (head movement) estimation. */
export const FACE_SCALE_LANDMARKS = { left: 33, right: 263 };

export const REMINDER_PRESETS = {
  gentle: { label: 'Gentle', thresholdPerMinute: 8, cooldownSec: 300 },
  balanced: { label: 'Balanced', thresholdPerMinute: 12, cooldownSec: 180 },
  attentive: { label: 'Attentive', thresholdPerMinute: 16, cooldownSec: 120 },
};

export const REMINDER_MESSAGES = [
  'Remember to blink naturally.',
  'Take a moment to relax your eyes.',
  'Your next eye break is approaching.',
  'Soft eyes, slow blinks — give them a moment.',
  'Blink slowly a few times and let your eyes reset.',
];

export const DEFAULT_SETTINGS = {
  version: 1,
  theme: 'dark',
  onboardingComplete: false,
  monitoringEnabled: true,
  cameraId: '',
  showLandmarks: true,
  targetFps: 15,
  blinkSensitivity: 0.55,
  calibration: null,
  blinkReminders: true,
  reminderSensitivity: 'balanced',
  reminderSound: true,
  soundVolume: 0.6,
  breakReminders: true,
  breakIntervalMin: 20,
  breakDurationSec: 20,
  snoozeMin: 5,
  comfortMode: false,
  comfortIntensity: 0.35,
  demoMode: false,
};

export const PERIODS = [
  { id: 'today', label: 'Today', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
];

/** Minimum monitoring time before a blink rate is considered meaningful. */
export const MIN_RATE_SAMPLE_MS = 5000;

/** Default open-eye EAR baseline used before personal calibration. */
export const DEFAULT_EAR_BASELINE = 0.3;

export const MAX_STORED_SESSIONS = 250;
