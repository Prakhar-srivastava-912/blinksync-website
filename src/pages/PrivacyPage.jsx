import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import { APP_VERSION } from '../lib/constants.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';

const STORED = [
  ['blinksync.settings.v1', 'Theme, reminder preferences, camera id, sensitivity, calibration baseline.', 'Until you delete it'],
  ['blinksync.sessions.v1', 'Start/end time, monitored duration, blink count, average rate, per-session samples.', 'Latest 250 sessions'],
  ['blinksync.breaks.v1', 'Break due time, outcome (completed/postponed/skipped), duration and snooze count.', 'Latest 500 outcomes'],
  ['blinksync.achievements.v1', 'Badge id and unlock timestamp.', 'Until reset'],
  ['blinksync.demo-sessions.v1', 'Clearly labelled simulated sessions for demonstration.', 'Until you clear demo data'],
];

export default function PrivacyPage() {
  const { exportData, deleteAllData, storageBytes } = useApp();

  return (
    <div className="container page privacy-page">
      <PageHeader
        eyebrow="Privacy & about"
        title="Your camera. Your device. Your data."
        description="BlinkSync is built so that eye tracking cannot become surveillance. This page explains exactly what happens to every frame and every number."
        actions={<Badge tone="teal" dot>Privacy-first by design</Badge>}
      />

      <div className="privacy-hero">
        <div className="privacy-hero-icon">
          <Icon name="ShieldCheck" size={32} />
        </div>
        <div>
          <h2>There is no backend to send your face to.</h2>
          <p>
            BlinkSync is a static single-page application. Detection runs in your browser with MediaPipe WebAssembly,
            and the only network requests are for the app's own code, the bundled model and the WASM runtime. No
            analytics script, no tracking pixel and no account system is included.
          </p>
        </div>
      </div>

      <div className="privacy-grid">
        <Card>
          <CardHeader title="What is processed" icon={<Icon name="Cpu" size={18} />} />
          <ol className="privacy-process">
            <li>
              <strong>Camera frames</strong>
              <span>Read directly from a video element in this tab, scaled to 640×480 by default.</span>
            </li>
            <li>
              <strong>Facial landmarks</strong>
              <span>478 points are computed in WebAssembly memory for the current frame only.</span>
            </li>
            <li>
              <strong>Eye Aspect Ratio</strong>
              <span>Six lid points per eye become one openness number; the frame is then discarded.</span>
            </li>
          </ol>
          <p className="inline-note">
            <Icon name="Lock" size={15} /> Nothing in this list is written to disk, sent over the network, or accessible
            to another tab.
          </p>
        </Card>

        <Card>
          <CardHeader title="What is never done" icon={<Icon name="Shield" size={18} />} />
          <ul className="cross-list">
            <li>
              <Icon name="X" size={15} /> No webcam video or images are recorded, downloaded or streamed.
            </li>
            <li>
              <Icon name="X" size={15} /> No landmarks are transmitted to any server.
            </li>
            <li>
              <Icon name="X" size={15} /> No face recognition, identity inference or emotion detection.
            </li>
            <li>
              <Icon name="X" size={15} /> No third-party analytics, ads or fingerprinting.
            </li>
            <li>
              <Icon name="X" size={15} /> No selling or sharing of any data — there is none to sell.
            </li>
          </ul>
        </Card>
      </div>

      <Card id="data" className="privacy-data-card">
        <CardHeader
          title="Exactly what is saved locally"
          subtitle={`Currently using about ${Math.max(1, Math.round(storageBytes / 1024))} KB of localStorage.`}
          icon={<Icon name="FileJson" size={18} />}
          action={<Badge tone="muted">Max 250 sessions</Badge>}
        />
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Local storage keys and their contents</caption>
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Contents</th>
                <th scope="col">Retention</th>
              </tr>
            </thead>
            <tbody>
              {STORED.map(([key, contents, retention]) => (
                <tr key={key}>
                  <td>
                    <code>{key}</code>
                  </td>
                  <td>{contents}</td>
                  <td>{retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="privacy-controls">
          <Button icon="Download" variant="secondary" onClick={exportData}>
            Export my statistics
          </Button>
          <Link to="/settings" className="btn btn-ghost">
            <Icon name="SlidersHorizontal" size={16} />
            <span>Manage data in Settings</span>
          </Link>
        </div>
      </Card>

      <div className="privacy-grid">
        <Card>
          <CardHeader title="Camera permissions" icon={<Icon name="Camera" size={18} />} />
          <p className="prose">
            Your browser asks for permission the first time you press start. BlinkSync never opens the camera on page
            load, and the permission can be revoked at any time from the browser's site settings.
          </p>
          <ul className="check-list">
            <li>
              <Icon name="Check" size={16} /> Stopping monitoring calls <code>track.stop()</code> immediately.
            </li>
            <li>
              <Icon name="Check" size={16} /> The preview stops and the camera indicator switches off.
            </li>
            <li>
              <Icon name="Check" size={16} /> Pausing keeps the preview but stops analysing frames.
            </li>
            <li>
              <Icon name="Check" size={16} /> Leaving the tab pauses the animation loop; hidden tabs are not analysed.
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Your choices" icon={<Icon name="User" size={18} />} />
          <ul className="check-list">
            <li>
              <Icon name="Check" size={16} /> Turn off blink reminders or break reminders independently.
            </li>
            <li>
              <Icon name="Check" size={16} /> Pause break reminders for 30 minutes without losing your interval.
            </li>
            <li>
              <Icon name="Check" size={16} /> Export everything as a JSON file you own.
            </li>
            <li>
              <Icon name="Check" size={16} /> Reset statistics while keeping preferences.
            </li>
            <li>
              <Icon name="Check" size={16} /> Delete every locally stored key, including settings and calibration.
            </li>
          </ul>
          <Button variant="danger" size="sm" icon="Trash2" onClick={deleteAllData} className="privacy-delete">
            Delete all app data
          </Button>
        </Card>
      </div>

      <Card id="limitations" className="privacy-limitations">
        <CardHeader title="Honest limitations" icon={<Icon name="Info" size={18} />} />
        <div className="limitations-grid">
          <div>
            <h3>Not a medical device</h3>
            <p>
              BlinkSync does not diagnose, treat, cure or prevent dry eye, digital eye strain or any other condition.
              It is a habit-awareness tool. Consult an eye-care professional for symptoms.
            </p>
          </div>
          <div>
            <h3>Webcam estimates are approximate</h3>
            <p>
              Lighting, glasses, head angle, make-up, camera quality and occlusion change landmark geometry. Eye
              Aspect Ratio is a geometric proxy for openness, not a clinical measurement.
            </p>
          </div>
          <div>
            <h3>No universal “healthy” blink rate</h3>
            <p>
              Blink rate varies widely between people and tasks. BlinkSync compares you with your own recent pattern
              using configurable thresholds instead of asserting a medical target.
            </p>
          </div>
          <div>
            <h3>Browser-only comfort mode</h3>
            <p>
              The warm overlay affects BlinkSync's own surfaces only. A website cannot change your operating system's
              display colour temperature, and BlinkSync does not claim to.
            </p>
          </div>
          <div>
            <h3>Local data can be lost</h3>
            <p>
              Clearing browser data, private browsing or a different device means a fresh start. Export your
              statistics if you want to keep a copy.
            </p>
          </div>
          <div>
            <h3>Demo data is not real</h3>
            <p>
              Demo Mode uses a simulated blink trace. It is labelled throughout the interface, stored separately, and
              excluded from achievements and your real analytics.
            </p>
          </div>
        </div>
      </Card>

      <Card id="about" className="privacy-about">
        <CardHeader title="About BlinkSync" subtitle={`Version ${APP_VERSION}`} icon={<Icon name="ScanFace" size={18} />} />
        <p className="prose">
          BlinkSync was built as a complete, honest eye-care companion: real on-device computer vision, a configurable
          20-20-20 assistant, understandable analytics, personal calibration and full data control. It favours
          transparency over impressive-sounding numbers.
        </p>
        <div className="about-meta">
          <span>
            <strong>Vision</strong> MediaPipe Tasks Vision · Face Landmarker
          </span>
          <span>
            <strong>Frontend</strong> React + Vite · Recharts · Lucide
          </span>
          <span>
            <strong>Storage</strong> Browser localStorage only
          </span>
          <span>
            <strong>Backend</strong> None
          </span>
        </div>
        <div className="btn-row">
          <Link to="/privacy#data" className="btn btn-ghost btn-sm">
            What is stored
          </Link>
          <Link to="/privacy#limitations" className="btn btn-ghost btn-sm">
            Limitations
          </Link>
          <Link to="/dashboard" className="btn btn-secondary btn-sm">
            Back to dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}
