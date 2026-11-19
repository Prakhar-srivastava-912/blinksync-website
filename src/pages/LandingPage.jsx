import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import Icon from '../components/ui/Icon.jsx';

const STEPS = [
  {
    icon: 'Camera',
    title: 'Enable your camera',
    text: 'You grant access explicitly. The preview stays on your device and can be stopped in one click.',
  },
  {
    icon: 'ScanFace',
    title: 'Detect 478 landmarks',
    text: 'MediaPipe Face Landmarker maps your eyes, brows and face shape from each frame, locally.',
  },
  {
    icon: 'Activity',
    title: 'Measure eye openness',
    text: 'An Eye Aspect Ratio is calculated from six lid landmarks per eye, then smoothed to reject noise.',
  },
  {
    icon: 'Coffee',
    title: 'Get gentle nudges',
    text: 'Blink awareness prompts and 20-20-20 breaks help you reset before strain builds up.',
  },
];

const FEATURES = [
  {
    icon: 'Eye',
    title: 'Real blink detection',
    text: 'A hysteresis state machine counts complete open→closed→open blinks and ignores long closures, head movement and dropped frames.',
    tone: 'cyan',
  },
  {
    icon: 'Timer',
    title: '20-20-20 break assistant',
    text: 'A calm, animated 20-second countdown every 20 minutes of screen time — with snooze, history and completion tracking.',
    tone: 'teal',
  },
  {
    icon: 'BarChart3',
    title: 'Understandable analytics',
    text: 'Blink rate, session length and break history charted over today, 7 or 30 days from your real saved sessions.',
    tone: 'sky',
  },
  {
    icon: 'Focus',
    title: 'Personal calibration',
    text: 'A four-second guided calibration measures your open-eye baseline so detection fits your eyes and camera distance.',
    tone: 'violet',
  },
  {
    icon: 'Sun',
    title: 'Comfort mode',
    text: 'A warm in-app tint with adjustable intensity for evening sessions. It never claims to change your display temperature.',
    tone: 'amber',
  },
  {
    icon: 'ShieldCheck',
    title: 'Privacy by architecture',
    text: 'No backend, no accounts, no uploads. Only the statistics you can export are written to local storage.',
    tone: 'rose',
  },
];

const RULE = [
  { value: '20', unit: 'minutes', label: 'Look at a screen, then pause', icon: 'Clock' },
  { value: '20', unit: 'feet', label: 'Focus roughly 6 metres away', icon: 'Eye' },
  { value: '20', unit: 'seconds', label: 'Hold the distance, blink softly', icon: 'Timer' },
];

export default function LandingPage() {
  const { settings } = useApp();
  const startTarget = settings.onboardingComplete ? '/monitor' : '/onboarding';

  return (
    <div className="landing">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="pill">
              <span className="pill-dot" aria-hidden="true" />
              On-device AI eye care · no video ever leaves your browser
            </span>
            <h1 className="hero-title">
              Your Eyes Work Hard.
              <span className="grad-text"> Let BlinkSync Care.</span>
            </h1>
            <p className="hero-lead">
              When you concentrate, blinking quietly drops. BlinkSync watches your blink pattern through the webcam,
              estimates your blink rate in real time, and nudges you toward soft blinks and regular 20-20-20 breaks.
            </p>
            <div className="hero-actions">
              <Link to={startTarget} className="btn btn-primary btn-lg">
                <Icon name="Play" size={19} />
                <span>Start monitoring</span>
              </Link>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">
                <Icon name="BarChart3" size={19} />
                <span>See my dashboard</span>
              </Link>
            </div>
            <ul className="hero-trust">
              <li>
                <Icon name="Lock" size={15} /> 100% local inference
              </li>
              <li>
                <Icon name="CameraOff" size={15} /> Nothing recorded
              </li>
              <li>
                <Icon name="Sparkles" size={15} /> Demo mode included
              </li>
            </ul>
          </div>

          <div className="hero-visual" aria-label="Illustration of the BlinkSync monitor">
            <div className="preview-card">
              <div className="preview-head">
                <span className="preview-title">
                  <span className="preview-live-dot" aria-hidden="true" /> Product preview
                </span>
                <span className="preview-chip">On-device</span>
              </div>

              <div className="preview-eye">
                <span className="eye-orbit eye-orbit-a" aria-hidden="true" />
                <span className="eye-orbit eye-orbit-b" aria-hidden="true" />
                <span className="eye-scan-line" aria-hidden="true" />
                <svg viewBox="0 0 220 110" className="preview-eye-svg" aria-hidden="true">
                  <path
                    d="M14 55c22-31 53-46 96-46s74 15 96 46c-22 31-53 46-96 46S36 86 14 55Z"
                    fill="rgba(34, 211, 238, 0.05)"
                    stroke="rgba(34, 211, 238, 0.75)"
                    strokeWidth="2.4"
                  />
                  <circle cx="110" cy="55" r="25" fill="url(#hero-iris)" />
                  <circle cx="110" cy="55" r="10" fill="#04101f" />
                  <circle cx="118" cy="46" r="5" fill="#eafaff" opacity="0.9" />
                  <defs>
                    <radialGradient id="hero-iris">
                      <stop offset="0%" stopColor="#67e8f9" />
                      <stop offset="70%" stopColor="#0ea5b7" />
                      <stop offset="100%" stopColor="#0b4a5c" />
                    </radialGradient>
                  </defs>
                </svg>
                <span className="eye-scan-tag">EAR tracking</span>
              </div>

              <div className="preview-grid">
                <div className="preview-metric">
                  <span>Blink rate</span>
                  <strong>—</strong>
                  <small>per minute</small>
                </div>
                <div className="preview-metric">
                  <span>Session</span>
                  <strong>—</strong>
                  <small>timer</small>
                </div>
                <div className="preview-metric">
                  <span>Next break</span>
                  <strong>20:00</strong>
                  <small>20-20-20</small>
                </div>
              </div>

              <div className="preview-wave" aria-hidden="true">
                <svg viewBox="0 0 320 60" preserveAspectRatio="none">
                  <path
                    d="M0 42c22 0 22-22 44-22s22 30 44 30 24-34 46-34 22 26 44 26 22-18 44-18 22 12 44 12 22-8 54-8"
                    fill="none"
                    stroke="url(#wave-grad)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="wave-grad" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#22d3ee" stopOpacity="0.2" />
                      <stop offset="0.5" stopColor="#22d3ee" />
                      <stop offset="1" stopColor="#2dd4bf" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="floating-chip chip-a">
              <Icon name="ShieldCheck" size={16} />
              <span>0 frames uploaded</span>
            </div>
            <div className="floating-chip chip-b">
              <Icon name="ScanFace" size={16} />
              <span>478 landmarks · local</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stat-band" aria-label="At a glance">
        <div className="container stat-band-grid">
          <div>
            <strong>0</strong>
            <span>frames sent to a server</span>
          </div>
          <div>
            <strong>478</strong>
            <span>facial landmarks per frame</span>
          </div>
          <div>
            <strong>20-20-20</strong>
            <span>evidence-informed break rhythm</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>client-side, no account needed</span>
          </div>
        </div>
      </section>

      <section className="section container" id="how-it-works">
        <header className="section-head">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">From webcam frame to a kinder screen habit</h2>
          <p className="section-lead">
            Four transparent steps. Everything runs in your browser tab using MediaPipe Tasks Vision, and each step is
            visible in the app.
          </p>
        </header>

        <ol className="step-grid">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step-card">
              <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="step-icon">
                <Icon name={step.icon} size={22} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section-tinted" id="features">
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">Key features</p>
            <h2 className="section-title">A complete eye-care loop, not a blink counter demo</h2>
            <p className="section-lead">
              Monitoring, analysis, breaks, achievements and data control all ship together — and every control does
              something real.
            </p>
          </header>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className={`feature-card feature-${feature.tone}`}>
                <span className="feature-icon">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section container" id="breaks">
        <div className="split">
          <div className="split-copy">
            <p className="eyebrow">Why visual breaks matter</p>
            <h2 className="section-title">The 20-20-20 rule is simple on purpose</h2>
            <p>
              Sustained near-focus work keeps your ciliary muscle contracted and reduces blink quality. Looking into the
              distance gives those muscles a chance to relax, and a complete blink re-wets the eye surface.
            </p>
            <p>
              BlinkSync schedules the rule for you, counts the 20 seconds with a calm animation, and records only
              whether you completed the break — never why you skipped it.
            </p>
            <ul className="check-list">
              <li>
                <Icon name="Check" size={16} /> Choose your own interval, including short demo intervals
              </li>
              <li>
                <Icon name="Check" size={16} /> Postpone when you are mid-sentence — the timer adapts
              </li>
              <li>
                <Icon name="Check" size={16} /> Break reminders work on every page of the app
              </li>
              <li>
                <Icon name="Check" size={16} /> No streak rewards for screen time, ever
              </li>
            </ul>
          </div>

          <div className="rule-grid">
            {RULE.map((item) => (
              <div key={item.label} className="rule-card">
                <span className="rule-icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <p className="rule-value">
                  {item.value} <span>{item.unit}</span>
                </p>
                <p className="rule-label">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container" id="privacy">
        <div className="privacy-band">
          <div className="privacy-band-icon">
            <Icon name="ShieldCheck" size={30} />
          </div>
          <div className="privacy-band-copy">
            <h2>Privacy is the architecture, not a promise in small print</h2>
            <p>
              Frames are read from the video element, converted to landmarks in memory, and discarded. There is no
              server to send them to. Only session summaries and break outcomes are saved locally — and you can export
              or delete them at any time.
            </p>
            <div className="privacy-band-actions">
              <Link to="/privacy" className="btn btn-secondary">
                <Icon name="Lock" size={17} />
                <span>Read the privacy details</span>
              </Link>
              <Link to="/onboarding" className="btn btn-ghost">
                <span>See the guided setup</span>
                <Icon name="ArrowRight" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="cta-panel">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h2>Give your eyes a companion for the next work session.</h2>
            <p>No sign-up. No installation beyond the browser tab you already have open.</p>
          </div>
          <div className="cta-actions">
            <Link to={startTarget} className="btn btn-primary btn-lg">
              <Icon name="Camera" size={19} />
              <span>{settings.onboardingComplete ? 'Open monitoring' : 'Set up in 60 seconds'}</span>
            </Link>
            <Link to="/analytics" className="btn btn-secondary btn-lg">
              <Icon name="BarChart3" size={19} />
              <span>See analytics</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
