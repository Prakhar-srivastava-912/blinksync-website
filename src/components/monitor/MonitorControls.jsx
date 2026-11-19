import { Link } from '../../lib/router.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useMonitor } from '../../context/MonitorContext.jsx';
import Card, { CardHeader } from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Toggle from '../ui/Toggle.jsx';
import Icon from '../ui/Icon.jsx';

const ACTIVE = ['running', 'demo', 'calibrating', 'paused', 'initializing', 'requesting-camera'];

export default function MonitorControls() {
  const { settings, updateSettings } = useApp();
  const { status, start, stop, pause, resume, simulated } = useMonitor();
  const active = ACTIVE.includes(status);
  const paused = status === 'paused';

  return (
    <Card>
      <CardHeader
        title="Monitoring controls"
        subtitle="The camera is opened only after you press start, and its tracks are stopped as soon as you stop."
      />

      <div className="btn-row">
        {!active ? (
          <Button icon="Camera" onClick={() => start({ mode: 'live' })} disabled={!settings.monitoringEnabled}>
            Start live monitoring
          </Button>
        ) : null}
        {!active ? (
          <Button variant="secondary" icon="Sparkles" onClick={() => start({ mode: 'demo' })}>
            Start demo mode
          </Button>
        ) : null}
        {active && !paused ? (
          <Button variant="secondary" icon="Pause" onClick={pause}>
            Pause
          </Button>
        ) : null}
        {active && paused ? (
          <Button icon="Play" onClick={resume}>
            Resume
          </Button>
        ) : null}
        {active ? (
          <Button variant="danger" icon="Square" onClick={() => stop()}>
            Stop &amp; save
          </Button>
        ) : null}
        <Link to="/settings" className="btn btn-ghost">
          <Icon name="Settings" size={17} />
          <span>Settings</span>
        </Link>
      </div>

      {active ? (
        <p className="inline-note">
          <Icon name={simulated ? 'Sparkles' : paused ? 'Pause' : 'CircleDot'} size={15} />
          {simulated
            ? 'Demo Mode is running on simulated data. No camera is used and demo statistics stay separate.'
            : paused
              ? 'Monitoring is paused — no frames are being analysed, and the session will resume where it left off.'
              : 'Monitoring runs while you browse BlinkSync. Stopping saves the session to local storage.'}
        </p>
      ) : null}

      <div className="control-grid">
        <Toggle
          label="Monitoring enabled"
          description="Master switch for all camera-based monitoring."
          checked={settings.monitoringEnabled}
          onChange={(value) => updateSettings({ monitoringEnabled: value })}
        />
        <Toggle
          label="Landmark overlay"
          description="Draw the detected eye and face landmarks on the preview."
          checked={settings.showLandmarks}
          onChange={(value) => updateSettings({ showLandmarks: value })}
        />
      </div>

      <p className="privacy-line">
        <Icon name="Lock" size={14} /> Frames are processed in this tab and discarded after each detection. They are
        never uploaded, recorded or saved.
      </p>
    </Card>
  );
}
