import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useMonitor } from '../../context/MonitorContext.jsx';
import { formatRelative } from '../../lib/format.js';
import { calibrationLabel } from '../../lib/settingsSchema.js';
import Card, { CardHeader } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import SliderField from '../ui/SliderField.jsx';
import Icon from '../ui/Icon.jsx';

export default function CalibrationCard() {
  const { settings, updateSettings } = useApp();
  const { calibration, startCalibration, status } = useMonitor();
  const [confirmReset, setConfirmReset] = useState(false);
  const running = status === 'running' || status === 'calibrating';

  return (
    <Card>
      <CardHeader
        title="Calibration & sensitivity"
        subtitle="A personal baseline makes blink detection more reliable for your eyes and camera distance."
        action={
          <span className={`badge ${settings.calibration ? 'badge-teal' : 'badge-muted'}`}>
            {calibrationLabel(settings.calibration)}
          </span>
        }
      />

      <div className="calibration-summary">
        <div>
          <p className="calibration-label">Open-eye baseline (EAR)</p>
          <p className="calibration-value">
            {settings.calibration ? settings.calibration.openBaseline.toFixed(3) : 'Default (0.300)'}
          </p>
          <p className="calibration-meta">
            {settings.calibration
              ? `Captured ${formatRelative(settings.calibration.updatedAt)} · ${settings.calibration.sampleCount ?? 0} samples`
              : 'Run calibration to measure your own baseline.'}
          </p>
        </div>
        <div className="calibration-actions">
          <Button
            size="sm"
            variant="secondary"
            icon="Focus"
            onClick={() => startCalibration()}
            disabled={!running || calibration.active}
          >
            {settings.calibration ? 'Recalibrate' : 'Start calibration'}
          </Button>
          {settings.calibration ? (
            <Button
              size="sm"
              variant="ghost"
              icon="RotateCcw"
              onClick={() => {
                if (confirmReset) {
                  updateSettings({ calibration: null });
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                }
              }}
            >
              {confirmReset ? 'Confirm reset' : 'Reset'}
            </Button>
          ) : null}
        </div>
      </div>

      {!running ? (
        <p className="inline-note">
          <Icon name="Info" size={15} /> Start monitoring to run calibration. It takes about 4 seconds with your face in
          view.
        </p>
      ) : null}

      <SliderField
        label="Blink detection sensitivity"
        value={settings.blinkSensitivity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => updateSettings({ blinkSensitivity: value })}
        formatValue={(value) => `${Math.round(value * 100)}%`}
        help="Higher sensitivity counts lighter lid closures. Lower it if blinks are double-counted; raise it if soft blinks are missed."
      />

      <details className="details-block">
        <summary>When should I recalibrate?</summary>
        <ul className="tip-list">
          <li>You moved to a different chair, camera or room.</li>
          <li>The lighting changed significantly (bright window, evening lamp).</li>
          <li>Blink counts look too high or too low compared with how your eyes feel.</li>
          <li>You switched to a different camera from Settings.</li>
        </ul>
      </details>
    </Card>
  );
}
