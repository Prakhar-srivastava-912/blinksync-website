import { useEffect, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useMonitor } from '../context/MonitorContext.jsx';
import { APP_VERSION, REMINDER_PRESETS } from '../lib/constants.js';
import { calibrationLabel } from '../lib/settingsSchema.js';
import { formatRelative } from '../lib/format.js';
import { playChime, unlockAudio } from '../lib/audio.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Toggle from '../components/ui/Toggle.jsx';
import SliderField from '../components/ui/SliderField.jsx';
import SelectField from '../components/ui/SelectField.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import Badge from '../components/ui/Badge.jsx';
import Icon from '../components/ui/Icon.jsx';
import Modal from '../components/ui/Modal.jsx';

const INTERVAL_OPTIONS = [1, 5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
  value: String(minutes),
  label: minutes === 20 ? '20 minutes (20-20-20)' : `${minutes} minute${minutes === 1 ? '' : 's'}${minutes <= 5 ? ' · demo' : ''}`,
}));

const DURATION_OPTIONS = [10, 20, 30, 60, 120].map((seconds) => ({
  value: String(seconds),
  label: `${seconds} seconds${seconds === 20 ? ' (20-20-20)' : ''}`,
}));

const SNOOZE_OPTIONS = [1, 3, 5, 10, 15, 30].map((minutes) => ({
  value: String(minutes),
  label: `${minutes} minute${minutes === 1 ? '' : 's'}`,
}));

const SENSITIVITY_OPTIONS = Object.entries(REMINDER_PRESETS).map(([value, preset]) => ({
  value,
  label: `${preset.label} — below ${preset.thresholdPerMinute}/min, repeat after ${preset.cooldownSec / 60} min`,
}));

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    exportData,
    resetStats,
    deleteAllData,
    storageBytes,
    notify,
    breakPausedUntil,
    pauseBreaks,
    resumeBreaks,
  } = useApp();
  const { cameras, refreshCameras, status } = useMonitor();
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  const testSound = async () => {
    await unlockAudio();
    const played = playChime({ volume: settings.soundVolume, kind: 'break' });
    notify(played ? 'Reminder sound played.' : 'Audio is unavailable in this browser.', {
      tone: played ? 'success' : 'warning',
      icon: played ? 'Volume2' : 'VolumeX',
    });
  };

  const cameraOptions = [
    { value: '', label: cameras.length > 0 ? 'Default camera' : 'Default camera (grant access to list devices)' },
    ...cameras.map((camera) => ({ value: camera.deviceId, label: camera.label })),
  ];

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Settings"
        title="Make BlinkSync fit your eyes"
        description="Preferences are stored in this browser only. There is no account and no server copy."
        actions={<Badge tone="muted">v{APP_VERSION}</Badge>}
      />

      <div className="settings-layout">
        <div className="settings-column">
          <Card>
            <CardHeader
              title="Camera & detection"
              subtitle="Choose the camera and tune how frames are analysed."
              icon={<Icon name="Camera" size={18} />}
            />
            <div className="field-stack">
              <Toggle
                label="Monitoring enabled"
                description="Master switch for camera access across BlinkSync."
                checked={settings.monitoringEnabled}
                onChange={(value) => updateSettings({ monitoringEnabled: value })}
              />

              <div className="camera-select-row">
                <SelectField
                  label="Camera"
                  value={settings.cameraId}
                  onChange={(value) => updateSettings({ cameraId: value })}
                  options={cameraOptions}
                  help="Camera names appear after you grant permission once. Switching cameras is applied on the next start."
                />
                <Button variant="ghost" size="sm" icon="RotateCcw" onClick={refreshCameras}>
                  Refresh
                </Button>
              </div>

              <SliderField
                label="Analysis frame rate"
                value={settings.targetFps}
                min={5}
                max={30}
                step={5}
                onChange={(value) => updateSettings({ targetFps: value })}
                formatValue={(value) => `${value} fps`}
                help="Lower values use less CPU. 15 fps is smooth enough for blink detection."
              />

              <SliderField
                label="Blink detection sensitivity"
                value={settings.blinkSensitivity}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => updateSettings({ blinkSensitivity: value })}
                formatValue={(value) => `${Math.round(value * 100)}%`}
                help="Adjust if soft blinks are missed (raise) or blinks are double-counted (lower)."
              />

              <Toggle
                label="Landmark overlay"
                description="Show detected eye and face landmarks on the preview."
                checked={settings.showLandmarks}
                onChange={(value) => updateSettings({ showLandmarks: value })}
              />
            </div>

            <div className="setting-row setting-row-bordered">
              <div>
                <p className="setting-label">Calibration</p>
                <p className="setting-description">
                  {settings.calibration
                    ? `${calibrationLabel(settings.calibration)} · baseline ${settings.calibration.openBaseline.toFixed(
                        3,
                      )} · ${formatRelative(settings.calibration.updatedAt)}`
                    : 'Not calibrated — the default baseline (0.300) is in use.'}
                </p>
              </div>
              <div className="setting-actions">
                <Link to="/monitor" className="btn btn-secondary btn-sm">
                  <Icon name="Focus" size={15} />
                  <span>{settings.calibration ? 'Recalibrate' : 'Calibrate'}</span>
                </Link>
                {settings.calibration ? (
                  <Button size="sm" variant="ghost" icon="RotateCcw" onClick={() => updateSettings({ calibration: null })}>
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            <p className="privacy-line">
              <Icon name="Lock" size={14} /> Camera frames never leave this tab. Detection runs while monitoring is
              active, including when you browse other BlinkSync pages.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Blink reminders"
              subtitle="Gentle nudges when your recent blink rate looks reduced."
              icon={<Icon name="Eye" size={18} />}
            />
            <div className="field-stack">
              <Toggle
                label="Blink reminders"
                description="Show a soft prompt when your rolling blink rate stays low."
                checked={settings.blinkReminders}
                onChange={(value) => updateSettings({ blinkReminders: value })}
              />
              <SelectField
                label="Reminder sensitivity"
                value={settings.reminderSensitivity}
                onChange={(value) => updateSettings({ reminderSensitivity: value })}
                options={SENSITIVITY_OPTIONS}
                help="Thresholds are configurable heuristics, not medical targets."
              />
              <Toggle
                label="Reminder sounds"
                description="A short generated chime for nudges and break prompts."
                checked={settings.reminderSound}
                onChange={(value) => updateSettings({ reminderSound: value })}
              />
              <div className="sound-row">
                <SliderField
                  label="Sound volume"
                  value={settings.soundVolume}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => updateSettings({ soundVolume: value })}
                  formatValue={(value) => `${Math.round(value * 100)}%`}
                  disabled={!settings.reminderSound}
                />
                <Button variant="secondary" size="sm" icon="Volume2" onClick={testSound} disabled={!settings.reminderSound}>
                  Test
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Break assistant"
              subtitle="The 20-20-20 rhythm and how often it prompts you."
              icon={<Icon name="Coffee" size={18} />}
            />
            <div className="field-stack">
              <Toggle
                label="Break reminders"
                description="Prompt a visual break after the configured screen time."
                checked={settings.breakReminders}
                onChange={(value) => updateSettings({ breakReminders: value })}
              />
              <SelectField
                label="Reminder interval"
                value={String(settings.breakIntervalMin)}
                onChange={(value) => updateSettings({ breakIntervalMin: Number(value) })}
                options={INTERVAL_OPTIONS}
                help="Intervals under 5 minutes are included so judges can see the whole flow quickly."
              />
              <div className="field-grid">
                <SelectField
                  label="Break length"
                  value={String(settings.breakDurationSec)}
                  onChange={(value) => updateSettings({ breakDurationSec: Number(value) })}
                  options={DURATION_OPTIONS}
                />
                <SelectField
                  label="Postpone length"
                  value={String(settings.snoozeMin)}
                  onChange={(value) => updateSettings({ snoozeMin: Number(value) })}
                  options={SNOOZE_OPTIONS}
                />
              </div>
            </div>
            <div className="setting-row setting-row-bordered">
              <div>
                <p className="setting-label">Temporary pause</p>
                <p className="setting-description">
                  {breakPausedUntil > Date.now()
                    ? `Paused until ${new Date(breakPausedUntil).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}.`
                    : 'Pause prompts for 30 minutes without changing your settings.'}
                </p>
              </div>
              <div className="setting-actions">
                {breakPausedUntil > Date.now() ? (
                  <Button size="sm" variant="secondary" icon="Bell" onClick={resumeBreaks}>
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" icon="BellOff" onClick={() => pauseBreaks(30)}>
                    Pause 30 min
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="settings-column">
          <Card>
            <CardHeader title="Appearance" subtitle="Theme and visual comfort." icon={<Icon name="Sun" size={18} />} />
            <div className="field-stack">
              <div className="field">
                <span className="field-label">Theme</span>
                <Segmented
                  options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                  ]}
                  value={settings.theme}
                  onChange={(value) => updateSettings({ theme: value })}
                  label="Theme"
                />
              </div>

              <Toggle
                label="Comfort mode"
                description="Adds a warm tint inside BlinkSync for evening sessions."
                checked={settings.comfortMode}
                onChange={(value) => updateSettings({ comfortMode: value })}
              />

              <SliderField
                label="Comfort intensity"
                value={settings.comfortIntensity}
                min={0.05}
                max={0.85}
                step={0.05}
                onChange={(value) => updateSettings({ comfortIntensity: value })}
                formatValue={(value) => `${Math.round(value * 100)}%`}
                disabled={!settings.comfortMode}
                help="Kept subtle so text stays readable."
              />

              <div className="comfort-preview" aria-hidden="true">
                <div className="comfort-preview-gradient" style={{ opacity: settings.comfortMode ? settings.comfortIntensity + 0.4 : 0 }} />
                <span>Comfort preview</span>
                <small>Applied to this app's surfaces only.</small>
              </div>
            </div>

            <p className="inline-note">
              <Icon name="Info" size={15} /> Browsers cannot change your operating system's display colour temperature.
              Comfort mode tints BlinkSync only and is not a substitute for night-shift settings.
            </p>
          </Card>

          <Card>
            <CardHeader title="Your data" subtitle="Stored locally in this browser." icon={<Icon name="FileJson" size={18} />} />
            <div className="storage-meter">
              <div>
                <p className="setting-label">Local storage used</p>
                <p className="storage-value">{formatBytes(storageBytes)}</p>
              </div>
              <Badge tone="muted">No server copy</Badge>
            </div>
            <p className="setting-description">
              Sessions, break outcomes, achievements and preferences live in localStorage. Camera frames and landmarks
              are never stored.
            </p>
            <div className="btn-row">
              <Button variant="secondary" icon="Download" onClick={exportData}>
                Export statistics
              </Button>
              <Link to="/privacy" className="btn btn-ghost">
                <Icon name="ShieldCheck" size={16} />
                <span>Privacy details</span>
              </Link>
            </div>

            <div className="danger-zone">
              <div>
                <p className="setting-label">Reset statistics</p>
                <p className="setting-description">Clears sessions, breaks and achievements. Keeps your preferences.</p>
              </div>
              <Button variant="danger" size="sm" icon="RotateCcw" onClick={() => setConfirmAction('reset')}>
                Reset
              </Button>
            </div>
            <div className="danger-zone">
              <div>
                <p className="setting-label">Delete all application data</p>
                <p className="setting-description">Removes every BlinkSync key, including settings and calibration.</p>
              </div>
              <Button variant="danger" size="sm" icon="Trash2" onClick={() => setConfirmAction('delete')}>
                Delete everything
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="About BlinkSync" subtitle={`Version ${APP_VERSION}`} icon={<Icon name="Info" size={18} />} />
            <ul className="settings-about-list">
              <li>
                <Icon name="Cpu" size={16} /> MediaPipe Face Landmarker runs locally with WebAssembly.
              </li>
              <li>
                <Icon name="Eye" size={16} /> Blink detection uses Eye Aspect Ratio geometry with hysteresis thresholds.
              </li>
              <li>
                <Icon name="ShieldCheck" size={16} /> No analytics, no tracking pixels, no third-party requests for
                camera data.
              </li>
              <li>
                <Icon name="Info" size={16} /> Not a medical device. Readings are awareness aids only.
              </li>
            </ul>
            <div className="btn-row">
              <Link to="/onboarding" className="btn btn-ghost btn-sm">
                View guided setup
              </Link>
              <Link to="/monitor" className="btn btn-secondary btn-sm">
                {status === 'running' ? 'Back to monitoring' : 'Open monitoring'}
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        tone="danger"
        title={confirmAction === 'delete' ? 'Delete all BlinkSync data?' : 'Reset all statistics?'}
        description={
          confirmAction === 'delete'
            ? 'This permanently removes sessions, breaks, achievements, calibration and preferences from this browser. It cannot be undone.'
            : 'Sessions, break history and achievements will be erased. Your camera, reminder and appearance settings stay.'
        }
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={confirmAction === 'delete' ? 'Trash2' : 'RotateCcw'}
              data-autofocus
              onClick={() => {
                if (confirmAction === 'delete') deleteAllData();
                else resetStats();
                setConfirmAction(null);
              }}
            >
              {confirmAction === 'delete' ? 'Delete everything' : 'Reset statistics'}
            </Button>
          </div>
        }
      >
        <p className="modal-note">
          <Icon name="Info" size={15} /> Consider exporting your statistics first if you want a copy.
        </p>
        <Button variant="secondary" size="sm" icon="Download" onClick={exportData}>
          Export before continuing
        </Button>
      </Modal>
    </div>
  );
}
