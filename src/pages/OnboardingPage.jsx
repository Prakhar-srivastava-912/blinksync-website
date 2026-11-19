import { useState } from 'react';
import { Link, useRouter } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';

const STEPS = [
  {
    id: 'welcome',
    eyebrow: 'Step 1 · Welcome',
    icon: 'ScanFace',
    title: 'A calmer relationship with your screen',
    intro:
      'BlinkSync is an eye-care awareness tool. It watches your blinking through the webcam to help you notice reduced blinking and take better visual breaks.',
    points: [
      ['Eye', 'Real computer vision, not a random animation — MediaPipe Face Landmarker detects your eyes frame by frame.'],
      ['BarChart3', 'Honest analytics: your blink rate and sessions, with no invented “healthy” numbers.'],
      ['Heart', 'Gentle nudges instead of alarming alerts. Pause or switch them off whenever you like.'],
    ],
  },
  {
    id: 'how',
    eyebrow: 'Step 2 · How it works',
    icon: 'Cpu',
    title: 'Your camera becomes a measuring instrument — locally',
    intro:
      'Each frame is turned into 478 facial landmarks. From six lid landmarks per eye we compute an Eye Aspect Ratio (EAR), a standard geometric openness measure.',
    points: [
      ['Camera', 'The webcam opens only after you press start and grant permission.'],
      ['Activity', 'A complete open → closed → open transition lasting 60–600 ms counts as one blink.'],
      ['ShieldCheck', 'The frame is discarded immediately after landmarks are computed. No video is recorded.'],
    ],
  },
  {
    id: 'why',
    eyebrow: 'Step 3 · Why it matters',
    icon: 'Clock',
    title: 'Blinking is the easiest habit to lose at a screen',
    intro:
      'Concentration can reduce blink frequency and lead to incomplete blinks, which may contribute to dryness and discomfort. Awareness is the first step.',
    points: [
      ['Eye', 'Full, soft blinks spread the tear film over the eye surface.'],
      ['Timer', 'The 20-20-20 rule: every 20 minutes, look about 20 feet away for 20 seconds.'],
      ['Wind', 'BlinkSync schedules that pause, counts it down, and never rewards you for staying on screen longer.'],
    ],
  },
  {
    id: 'privacy',
    eyebrow: 'Step 4 · Camera & privacy',
    icon: 'Lock',
    title: 'You stay in control of the lens and the data',
    intro:
      'Camera access is requested by your browser. BlinkSync cannot open it silently, and stopping monitoring releases the camera immediately.',
    points: [
      ['ShieldCheck', 'Only session summaries are saved locally: start/end time, monitored duration, blink count and average rate.'],
      ['FileJson', 'You can export all statistics as JSON or delete everything from Settings.'],
      ['CameraOff', 'Permission denied? Demo Mode simulates the whole experience with clearly labelled fake data.'],
    ],
  },
];

export default function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const { completeOnboarding, settings } = useApp();
  const { navigate } = useRouter();
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const finish = (target) => {
    completeOnboarding();
    navigate(target);
  };

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Guided setup"
        title="Set up BlinkSync"
        description="Four short steps before the camera goes on. You can skip at any time."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => finish('/dashboard')}>
            Skip intro
            <Icon name="ArrowRight" size={16} />
          </button>
        }
      />

      <div className="onboarding-layout">
        <aside className="onboarding-rail" aria-label="Onboarding progress">
          {STEPS.map((entry, entryIndex) => (
            <button
              key={entry.id}
              type="button"
              className={`onboarding-step${entryIndex === index ? ' is-active' : ''}${
                entryIndex < index ? ' is-done' : ''
              }`}
              onClick={() => setIndex(entryIndex)}
            >
              <span className="onboarding-step-index">
                {entryIndex < index ? <Icon name="Check" size={14} /> : entryIndex + 1}
              </span>
              <span>
                <strong>{entry.eyebrow.split('· ')[1]}</strong>
                <small>{entry.title.split('—')[0]}</small>
              </span>
            </button>
          ))}
        </aside>

        <Card className="onboarding-card">
          <div className="onboarding-hero-icon">
            <Icon name={step.icon} size={28} />
          </div>
          <p className="eyebrow">{step.eyebrow}</p>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-intro">{step.intro}</p>

          <ul className="onboarding-points">
            {step.points.map(([icon, text]) => (
              <li key={text}>
                <span className="onboarding-point-icon">
                  <Icon name={icon} size={16} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          {step.id === 'privacy' ? (
            <div className="inline-note">
              <Icon name="Info" size={15} />
              BlinkSync is not a medical device. It cannot diagnose dry eye, strain or any other condition. If your eyes
              hurt or your vision changes, talk to an eye-care professional.
            </div>
          ) : null}

          <div className="onboarding-footer">
            <div className="onboarding-progress" aria-hidden="true">
              {STEPS.map((entry, entryIndex) => (
                <span key={entry.id} className={entryIndex <= index ? 'is-filled' : ''} />
              ))}
            </div>
            <div className="onboarding-actions">
              <Button
                variant="ghost"
                icon="ArrowLeft"
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
                disabled={index === 0}
              >
                Back
              </Button>
              {last ? (
                <Button icon="Camera" onClick={() => finish('/monitor')}>
                  Start setup
                </Button>
              ) : (
                <Button iconRight="ArrowRight" onClick={() => setIndex((current) => current + 1)}>
                  Continue
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {!settings.onboardingComplete ? (
        <p className="onboarding-skip">
          Prefer to look around first? <Link to="/dashboard">Open the dashboard</Link> or{' '}
          <Link to="/monitor">go straight to monitoring</Link>.
        </p>
      ) : null}
    </div>
  );
}
