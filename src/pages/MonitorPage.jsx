import { useEffect, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useMonitor } from '../context/MonitorContext.jsx';
import { formatRelative } from '../lib/format.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import CameraStage from '../components/monitor/CameraStage.jsx';
import LiveMetrics from '../components/monitor/LiveMetrics.jsx';
import MonitorControls from '../components/monitor/MonitorControls.jsx';
import CalibrationCard from '../components/monitor/CalibrationCard.jsx';

const STATUS_BADGE = {
  idle: { tone: 'muted', label: 'Idle' },
  'requesting-camera': { tone: 'info', label: 'Requesting camera' },
  initializing: { tone: 'info', label: 'Loading AI model' },
  calibrating: { tone: 'info', label: 'Calibrating' },
  running: { tone: 'success', label: 'Monitoring live' },
  demo: { tone: 'violet', label: 'Demo mode' },
  paused: { tone: 'muted', label: 'Paused' },
  error: { tone: 'danger', label: 'Needs attention' },
};

export default function MonitorPage() {
  const { settings, demoSessions, loadDemoHistory, clearDemoData, notify } = useApp();
  const monitor = useMonitor();
  const [dismissedNudge, setDismissedNudge] = useState(null);
  const badge = STATUS_BADGE[monitor.status] ?? STATUS_BADGE.idle;

  useEffect(() => {
    if (monitor.nudge?.at && monitor.nudge.at !== dismissedNudge) {
      // A new nudge should be visible again even if a previous one was dismissed.
      setDismissedNudge(null);
    }
  }, [monitor.nudge?.at, dismissedNudge]);

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Live AI monitoring"
        title="Watch your blinking, not your clock"
        description="MediaPipe Face Landmarker measures eye openness in this tab. If the face is not visible, measurements pause and the interface says so."
        actions={<Badge tone={badge.tone} dot>{badge.label}</Badge>}
      />

      {!settings.monitoringEnabled ? (
        <div className="inline-note inline-note-warning">
          <Icon name="Info" size={15} /> Monitoring is disabled in Settings. Enable “Monitoring enabled” to use the
          live camera.
        </div>
      ) : null}

      <div className="monitor-layout">
        <CameraStage />

        <div className="monitor-side">
          <LiveMetrics />

          {monitor.nudge && monitor.nudge.at !== dismissedNudge ? (
            <div className={`nudge-card nudge-${monitor.nudge.kind ?? 'blink'}`} role="status">
              <span className="nudge-icon">
                <Icon name={monitor.nudge.kind === 'rest' ? 'Wind' : 'Eye'} size={18} />
              </span>
              <div>
                <p className="nudge-title">{monitor.nudge.message}</p>
                <p className="nudge-meta">
                  {monitor.nudge.kind === 'rest' ? 'Long eye closure noted' : 'Low blink rate noted'} ·{' '}
                  {formatRelative(monitor.nudge.at)}
                </p>
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => setDismissedNudge(monitor.nudge.at)}
                aria-label="Dismiss nudge"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          ) : null}

          <Card className="tip-card">
            <CardHeader title="Getting a clean reading" icon={<Icon name="Sparkles" size={18} />} />
            <ul className="tip-list">
              <li>Face the camera with both eyes visible and roughly level.</li>
              <li>Even, front-facing light gives MediaPipe the best landmarks.</li>
              <li>Glasses are fine, but avoid strong reflections or a bright window behind you.</li>
              <li>The ear value shown is raw geometry, not a medical measurement.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid cols-2 monitor-panels">
        <MonitorControls />
        <CalibrationCard />
      </div>

      <Card className="demo-panel">
        <CardHeader
          title="Demo mode"
          subtitle="For venues without camera access. Simulated values are labelled everywhere and stored separately from real sessions."
          action={<Badge tone="violet">DEMO</Badge>}
        />
        <div className="demo-panel-body">
          <div>
            <p className="demo-panel-text">
              {monitor.simulated
                ? 'A simulated blink trace is running right now. Nothing is captured from a camera.'
                : 'Run the full interface with simulated blinks, or load sample history to preview the charts.'}
            </p>
            {demoSessions.length > 0 ? (
              <p className="demo-panel-meta">
                {demoSessions.length} simulated session{demoSessions.length === 1 ? '' : 's'} stored separately.
              </p>
            ) : null}
          </div>
          <div className="btn-row">
            {!monitor.simulated ? (
              <Button variant="secondary" icon="Sparkles" onClick={() => monitor.start({ mode: 'demo' })}>
                Start demo
              </Button>
            ) : (
              <Button variant="secondary" icon="Square" onClick={() => monitor.stop()}>
                Stop demo
              </Button>
            )}
            <Button variant="ghost" icon="CalendarDays" onClick={loadDemoHistory}>
              Load sample history
            </Button>
            {demoSessions.length > 0 ? (
              <Button variant="ghost" icon="Trash2" onClick={clearDemoData}>
                Clear demo data
              </Button>
            ) : null}
            <Link to="/analytics" className="btn btn-ghost">
              <Icon name="BarChart3" size={16} />
              <span>Demo analytics</span>
            </Link>
          </div>
        </div>
        <p className="privacy-line">
          <Icon name="Info" size={14} /> Demo statistics never unlock achievements and never appear in your real
          analytics.
        </p>
      </Card>

      <div className="disclaimer-strip">
        <Icon name="Info" size={18} />
        <p>
          BlinkSync is an awareness and wellness tool. Blink rate estimates can be affected by lighting, glasses,
          head angle and camera quality. Nothing here is a diagnosis, and a low or high reading is not by itself a sign
          of a medical condition.
        </p>
      </div>
    </div>
  );
}
