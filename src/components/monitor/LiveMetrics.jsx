import { useMonitor } from '../../context/MonitorContext.jsx';
import { formatDuration, formatNumber, formatRate } from '../../lib/format.js';
import Icon from '../ui/Icon.jsx';

function Metric({ icon, label, value, unit, hint, tone = 'cyan', meter = null }) {
  return (
    <div className={`live-metric metric-${tone}`}>
      <span className="live-metric-icon">
        <Icon name={icon} size={17} />
      </span>
      <div className="live-metric-body">
        <p className="live-metric-label">{label}</p>
        <p className="live-metric-value">
          {value}
          {unit ? <span className="live-metric-unit">{unit}</span> : null}
        </p>
        {meter !== null ? (
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.round(meter * 100)}%` }} />
          </div>
        ) : null}
        {hint ? <p className="live-metric-hint">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function LiveMetrics() {
  const monitor = useMonitor();
  const { status, blinkCount, blinkRate, ear, openness, durationMs, monitoredMs, facePresent, fps, simulated, paused } =
    monitor;

  const idle = status === 'idle';
  const rateKnown = monitoredMs >= 5000;
  const opennessPercent = openness === null || openness === undefined ? null : Math.round(openness * 100);

  return (
    <div className="live-metrics">
      <Metric
        icon="Eye"
        label="Blinks counted"
        value={idle ? '—' : formatNumber(blinkCount)}
        hint={simulated ? 'Simulated (demo)' : 'Detected from EAR transitions'}
        tone="cyan"
      />
      <Metric
        icon="Activity"
        label="Blink rate"
        value={idle ? '—' : rateKnown ? formatRate(blinkRate) : '—'}
        unit={rateKnown && !idle ? '/min' : ''}
        hint={rateKnown ? 'Rolling 60-second window' : 'Collecting first samples'}
        tone="teal"
      />
      <Metric
        icon="EyeOff"
        label="Eye openness"
        value={idle || opennessPercent === null ? '—' : `${opennessPercent}%`}
        meter={opennessPercent === null ? null : Math.min(1, opennessPercent / 100)}
        hint={ear ? `EAR ${ear.toFixed(3)}` : 'No landmark data'}
        tone="sky"
      />
      <Metric icon="Timer" label="Session duration" value={formatDuration(durationMs)} hint="Wall-clock session length" tone="violet" />
      <Metric
        icon={facePresent ? 'ScanFace' : 'EyeOff'}
        label="Face detection"
        value={paused ? 'Paused' : facePresent ? 'Detected' : 'Searching'}
        hint={status === 'demo' ? 'Demo simulation' : facePresent ? `${fps} frames analysed per second` : 'Measurements paused until a face is visible'}
        tone={facePresent ? 'amber' : 'rose'}
      />
      <Metric
        icon="Monitor"
        label="Monitoring status"
        value={
          {
            idle: 'Idle',
            running: 'Live',
            demo: 'Demo',
            paused: 'Paused',
            calibrating: 'Calibrating',
            initializing: 'Starting',
            'requesting-camera': 'Starting',
            error: 'Error',
          }[status] ?? 'Idle'
        }
        hint={simulated ? 'No camera in use' : 'On-device processing'}
        tone="cyan"
      />
    </div>
  );
}
