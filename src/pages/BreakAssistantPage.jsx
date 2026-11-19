import { useApp } from '../context/AppContext.jsx';
import { formatClock, formatDuration, formatTime } from '../lib/format.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import ProgressRing from '../components/ui/ProgressRing.jsx';
import Toggle from '../components/ui/Toggle.jsx';
import SelectField from '../components/ui/SelectField.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const INTERVAL_OPTIONS = [1, 5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
  value: String(minutes),
  label: minutes === 20 ? '20 minutes (recommended)' : minutes <= 5 ? `${minutes} min (demo)` : `${minutes} minutes`,
}));

const DURATION_OPTIONS = [10, 20, 30, 60].map((seconds) => ({
  value: String(seconds),
  label: seconds === 20 ? '20 seconds (20-20-20)' : `${seconds} seconds`,
}));

const SNOOZE_OPTIONS = [1, 3, 5, 10, 15].map((minutes) => ({
  value: String(minutes),
  label: `${minutes} minute${minutes === 1 ? '' : 's'}`,
}));

const BREAK_FACTS = [
  {
    icon: 'Clock',
    title: 'Every 20 minutes',
    text: 'A short pause from near-focus work gives your focusing muscles a chance to relax.',
  },
  {
    icon: 'Eye',
    title: 'Look 20 feet away',
    text: 'Distance focus is the reset. Windows help, but looking across the room works too.',
  },
  {
    icon: 'Timer',
    title: 'For 20 seconds',
    text: 'Long enough to blink fully a few times and let your tear film spread evenly.',
  },
];

const STATUS_META = {
  completed: { label: 'Completed', tone: 'success', icon: 'Check' },
  postponed: { label: 'Postponed', tone: 'warning', icon: 'Clock' },
  skipped: { label: 'Skipped', tone: 'muted', icon: 'X' },
};

export default function BreakAssistantPage() {
  const {
    settings,
    updateSettings,
    breakStatus,
    breakPausedUntil,
    startBreakNow,
    pauseBreaks,
    resumeBreaks,
    breaks,
  } = useApp();

  const paused = breakPausedUntil > Date.now();
  const running = breakStatus.phase === 'break';
  const progress = running ? breakStatus.breakProgress : breakStatus.progress;
  const realBreaks = breaks.filter((entry) => !entry.simulated);
  const completed = realBreaks.filter((entry) => entry.status === 'completed').length;
  const due = realBreaks.length;
  const remainingLabel = running
    ? formatClock(Math.ceil(breakStatus.breakRemainingMs / 1000))
    : formatDuration(breakStatus.remainingMs);

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Smart break assistant"
        title="Rest your focus, not your intentions"
        description="BlinkSync accumulates active screen time in this app and prompts the 20-20-20 rule. The reminder follows you across every page."
        actions={
          <Badge tone={paused ? 'muted' : running ? 'teal' : 'info'} dot>
            {paused ? 'Reminders paused' : running ? 'Break in progress' : 'Reminders active'}
          </Badge>
        }
      />

      <div className="break-layout">
        <Card className="break-hero-card">
          <div className="break-hero">
            <ProgressRing
              progress={progress}
              size={248}
              stroke={14}
              tone={running ? 'teal' : 'cyan'}
              label={running ? 'Break countdown' : 'Time until next break'}
              trackClassName={running ? 'break-ring' : ''}
            >
              <span className="ring-eyebrow">{running ? 'Look far away' : 'Next break in'}</span>
              <span className="ring-seconds">{remainingLabel}</span>
              <span className="ring-caption">
                {running
                  ? `${settings.breakDurationSec}-second reset`
                  : `${Math.round(breakStatus.progress * 100)}% of the interval elapsed`}
              </span>
            </ProgressRing>

            <div className="break-hero-actions">
              <Button icon="Coffee" onClick={startBreakNow} disabled={running}>
                Start a break now
              </Button>
              {paused ? (
                <Button variant="secondary" icon="Bell" onClick={resumeBreaks}>
                  Resume reminders
                </Button>
              ) : (
                <Button variant="secondary" icon="BellOff" onClick={() => pauseBreaks(30)}>
                  Pause for 30 min
                </Button>
              )}
            </div>

            {paused ? (
              <p className="inline-note inline-note-center">
                <Icon name="Pause" size={15} /> Reminders paused until{' '}
                {formatTime(breakPausedUntil)}. Screen time is not accumulating.
              </p>
            ) : null}
          </div>

          <div className="break-stats">
            <div>
              <span>{completed}</span>
              <small>breaks completed</small>
            </div>
            <div>
              <span>{due === 0 ? '—' : `${Math.round((completed / due) * 100)}%`}</span>
              <small>completion rate</small>
            </div>
            <div>
              <span>{settings.breakIntervalMin} min</span>
              <small>interval</small>
            </div>
            <div>
              <span>{settings.breakDurationSec}s</span>
              <small>break length</small>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Break settings" subtitle="Changes apply immediately and are saved on this device." />
          <div className="field-stack">
            <Toggle
              label="Break reminders"
              description="Prompt the 20-20-20 rule while BlinkSync is open."
              checked={settings.breakReminders}
              onChange={(value) => updateSettings({ breakReminders: value })}
            />
            <SelectField
              label="Reminder interval"
              value={String(settings.breakIntervalMin)}
              onChange={(value) => updateSettings({ breakIntervalMin: Number(value) })}
              options={INTERVAL_OPTIONS}
              help="Active screen time in BlinkSync, not wall-clock time. Short intervals are included for demos."
            />
            <SelectField
              label="Break length"
              value={String(settings.breakDurationSec)}
              onChange={(value) => updateSettings({ breakDurationSec: Number(value) })}
              options={DURATION_OPTIONS}
              help="The animated countdown runs for this long and completes automatically."
            />
            <SelectField
              label="Postpone length"
              value={String(settings.snoozeMin)}
              onChange={(value) => updateSettings({ snoozeMin: Number(value) })}
              options={SNOOZE_OPTIONS}
              help="How long “Remind me later” waits before the next prompt."
            />
          </div>
        </Card>
      </div>

      <div className="break-facts">
        {BREAK_FACTS.map((fact) => (
          <article key={fact.title} className="break-fact">
            <span className="break-fact-icon">
              <Icon name={fact.icon} size={20} />
            </span>
            <h3>{fact.title}</h3>
            <p>{fact.text}</p>
          </article>
        ))}
      </div>

      <div className="grid cols-2 break-lower">
        <Card>
          <CardHeader
            title="Break history"
            subtitle={`${realBreaks.length} recorded outcome${realBreaks.length === 1 ? '' : 's'}`}
            action={<Badge tone="muted">Real data only</Badge>}
          />
          {realBreaks.length === 0 ? (
            <EmptyState
              compact
              icon="Coffee"
              title="No breaks recorded yet"
              description="Start a break now or wait for the first reminder. Outcomes are logged automatically."
            />
          ) : (
            <ul className="mini-list">
              {realBreaks.slice(0, 8).map((entry) => {
                const meta = STATUS_META[entry.status] ?? STATUS_META.skipped;
                return (
                  <li key={entry.id}>
                    <span className={`mini-list-icon status-chip-${entry.status}`}>
                      <Icon name={meta.icon} size={14} />
                    </span>
                    <span className="mini-list-main">
                      <strong>{meta.label}</strong>
                      <small>{formatTime(entry.resolvedAt ?? entry.dueAt)}</small>
                    </span>
                    <span className="mini-list-meta">
                      {entry.status === 'completed'
                        ? `${entry.durationSec || settings.breakDurationSec}s away`
                        : entry.status === 'postponed'
                          ? `${entry.snoozes} snooze${entry.snoozes === 1 ? '' : 's'}`
                          : 'skipped'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Why the 20-20-20 rule?" icon={<Icon name="Info" size={18} />} />
          <p className="prose">
            Near-focus work keeps the eye's focusing muscle contracted for long stretches. Looking into the distance
            relaxes it, while a complete blink redistributes the tear film. The rule is deliberately simple so it
            survives a busy day.
          </p>
          <p className="prose">
            BlinkSync never claims this prevents or treats any condition. It is a practical reminder to interrupt
            sustained near work — one of the most common reasons eyes feel tired at a screen.
          </p>
          <ul className="check-list">
            <li>
              <Icon name="Check" size={16} /> Breaks work on every page of the app
            </li>
            <li>
              <Icon name="Check" size={16} /> Postponing is recorded honestly, never as a completed break
            </li>
            <li>
              <Icon name="Check" size={16} /> Pausing reminders stops the interval accumulating
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
