import { useMemo, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useMonitor } from '../context/MonitorContext.jsx';
import { buildAnalytics } from '../lib/analytics.js';
import { formatDuration, formatNumber, formatRate, formatRelative, formatTime } from '../lib/format.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import StatTile from '../components/ui/StatTile.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { ActivityChart, BreaksChart, ChartCard, RateTrendChart, SessionsChart } from '../components/charts/Charts.jsx';
import { PERIODS } from '../lib/constants.js';

const PERIOD_OPTIONS = PERIODS.map((period) => ({ value: period.id, label: period.label }));

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { sessions, breaks, demoSessions, breakStatus } = useApp();
  const monitor = useMonitor();
  const [period, setPeriod] = useState('today');

  const realBreaks = useMemo(() => breaks.filter((entry) => !entry.simulated), [breaks]);
  const analytics = useMemo(
    () => buildAnalytics({ sessions, breaks: realBreaks, period }),
    [sessions, realBreaks, period],
  );

  const live = ['running', 'demo', 'calibrating', 'paused'].includes(monitor.status);
  const evaluating = monitor.status === 'running' || monitor.status === 'demo' || monitor.status === 'calibrating';
  const rateKnown = monitor.monitoredMs >= 5000;
  const latest = analytics.latestSession;
  const todayBreaks = realBreaks.filter((entry) => {
    const date = new Date(entry.resolvedAt ?? entry.dueAt);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });
  const statusLabel = live
    ? monitor.status === 'paused'
      ? 'Paused'
      : monitor.simulated
        ? 'Demo running'
        : 'Monitoring live'
    : 'Idle';

  return (
    <div className="container page">
      <PageHeader
        eyebrow={`${greeting()} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
        title="Your eye activity"
        description="Everything here comes from sessions you actually ran. Nothing is estimated or back-filled."
        actions={
          <div className="header-actions">
            {live ? (
              <Badge tone={monitor.simulated ? 'violet' : 'success'} dot>
                {monitor.simulated ? 'DEMO' : monitor.status === 'paused' ? 'Paused' : 'Live now'}
              </Badge>
            ) : null}
            <Link to="/monitor" className="btn btn-primary btn-sm">
              <Icon name={live ? 'ScanFace' : 'Camera'} size={16} />
              <span>{live ? 'Open monitor' : 'Start monitoring'}</span>
            </Link>
          </div>
        }
      />

      {!live ? (
        <div className="dashboard-banner">
          <span className="dashboard-banner-icon">
            <Icon name="CameraOff" size={20} />
          </span>
          <div>
            <strong>Your camera is off.</strong>
            <p>Start a session to see live values here, or take a break right now if your eyes need one.</p>
          </div>
          <div className="btn-row">
            <Link to="/monitor" className="btn btn-secondary btn-sm">
              Start a session
            </Link>
            <Button size="sm" variant="ghost" icon="Coffee" onClick={() => monitor.start({ mode: 'demo' })}>
              Try demo
            </Button>
          </div>
        </div>
      ) : null}

      <div className="stat-grid">
        <StatTile
          icon="Activity"
          label="Current blink rate"
          value={live && rateKnown ? formatRate(monitor.blinkRate) : latest ? formatRate(latest.averageBlinkRate) : '—'}
          unit={live && rateKnown ? '/min' : latest ? '/min avg' : ''}
          hint={
            live
              ? rateKnown
                ? 'Rolling 60-second estimate'
                : 'Collecting the first samples'
              : latest
                ? `Last session · ${formatRelative(latest.startedAt)}`
                : 'No measurements yet'
          }
          tone="cyan"
          badge={monitor.simulated ? <Badge tone="violet">SIM</Badge> : null}
        />
        <StatTile
          icon="Eye"
          label="Session blinks"
          value={live ? formatNumber(monitor.blinkCount) : formatNumber(analytics.totals.blinkCount)}
          hint={live ? 'This session, live' : `Total in ${PERIODS.find((p) => p.id === period)?.label.toLowerCase()}`}
          tone="teal"
        />
        <StatTile
          icon="Timer"
          label="Session duration"
          value={live ? formatDuration(monitor.durationMs) : latest ? formatDuration(latest.monitoredMs) : '—'}
          hint={live ? 'Wall-clock session time' : 'Monitored time, last session'}
          tone="sky"
        />
        <StatTile
          icon="Coffee"
          label="Completed breaks"
          value={formatNumber(analytics.totals.breaksCompleted)}
          hint={`${analytics.totals.breaksDue} breaks due in this period`}
          tone="amber"
        />
        <StatTile
          icon="Monitor"
          label="Monitoring time"
          value={formatDuration(analytics.totals.monitoredMs, { showSeconds: false })}
          hint={`${analytics.totals.sessions} session${analytics.totals.sessions === 1 ? '' : 's'} in period`}
          tone="violet"
        />
        <StatTile
          icon={live ? 'ScanFace' : 'CircleDot'}
          label="Monitoring status"
          value={statusLabel}
          hint={
            live
              ? `${monitor.facePresent ? 'Face detected' : 'Searching for a face'} · ${monitor.fps} fps`
              : `Next break in ${formatDuration(breakStatus.remainingMs)}`
          }
          tone={live ? 'cyan' : 'sky'}
        />
      </div>

      {demoSessions.length > 0 ? (
        <div className="inline-note">
          <Icon name="Sparkles" size={15} />
          You have {demoSessions.length} simulated demo session{demoSessions.length === 1 ? '' : 's'} stored
          separately. They are excluded from these numbers; view them with the source switch on the Analytics page.
        </div>
      ) : null}

      <div className="section-header-row">
        <div>
          <h2 className="section-title-sm">Eye activity over time</h2>
          <p className="section-sub">Charts use saved session summaries from this browser.</p>
        </div>
        <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} label="Analytics period" size="sm" />
      </div>

      {analytics.empty && !monitor.simulated ? (
        <Card className="dashboard-empty">
          <EmptyState
            icon="BarChart3"
            title="No sessions in this period yet"
            description="Run a monitoring session (even 30 seconds is useful) and your blink activity will appear here. Only real measurements are charted."
            action={
              <div className="btn-row">
                <Link to="/monitor" className="btn btn-primary btn-sm">
                  Start monitoring
                </Link>
                <Button size="sm" variant="ghost" icon="Sparkles" onClick={() => monitor.start({ mode: 'demo' })}>
                  Explore demo mode
                </Button>
              </div>
            }
          />
        </Card>
      ) : null}

      <div className="chart-grid">
        <ChartCard
          title={analytics.activityTitle}
          subtitle={
            analytics.activityUnit === 'timeline'
              ? 'Blink rate sampled through your latest session'
              : 'Blinks counted per day'
          }
          empty={analytics.activity.length === 0}
          emptyTitle="No blink samples yet"
          emptyDescription="Start a session and keep your face in frame for at least five seconds."
        >
          <ActivityChart data={analytics.activity} unit={analytics.activityUnit} />
        </ChartCard>

        <ChartCard
          title="Blink-rate trend"
          subtitle="Average blinks per minute for each day with monitoring"
          empty={analytics.rateTrend.every((day) => day.rate === 0)}
          emptyTitle="No rate data yet"
          emptyDescription="A blink rate appears after five seconds of monitored time."
        >
          <RateTrendChart data={analytics.rateTrend} />
        </ChartCard>

        <ChartCard
          title="Daily monitoring sessions"
          subtitle="How many times you checked in, and for how long"
          empty={analytics.sessionBars.every((day) => day.sessions === 0)}
          emptyTitle="No sessions yet"
          emptyDescription="Sessions are saved when you stop monitoring."
        >
          <SessionsChart data={analytics.sessionBars} />
        </ChartCard>

        <ChartCard
          title="Break completion history"
          subtitle="Completed breaks compared with breaks that came due"
          empty={analytics.breakBars.every((day) => day.due === 0)}
          emptyTitle="No break history yet"
          emptyDescription="Break outcomes are recorded when the 20-20-20 reminder resolves."
        >
          <BreaksChart data={analytics.breakBars} />
        </ChartCard>
      </div>

      <div className="grid cols-2 dashboard-lower">
        <Card>
          <CardHeader
            title="Today's breaks"
            subtitle={`${todayBreaks.filter((entry) => entry.status === 'completed').length} completed today`}
            action={
              <Link to="/breaks" className="link-button">
                Break assistant <Icon name="ChevronRight" size={14} />
              </Link>
            }
          />
          {todayBreaks.length === 0 ? (
            <EmptyState
              compact
              icon="Coffee"
              title="No breaks recorded today"
              description="The assistant will prompt you after 20 minutes of screen time."
            />
          ) : (
            <ul className="mini-list">
              {todayBreaks.slice(0, 5).map((entry) => (
                <li key={entry.id}>
                  <span className={`mini-list-icon status-chip-${entry.status}`}>
                    <Icon name={entry.status === 'completed' ? 'Check' : entry.status === 'postponed' ? 'Clock' : 'X'} size={14} />
                  </span>
                  <span className="mini-list-main">
                    <strong>{entry.status === 'completed' ? 'Break completed' : entry.status === 'postponed' ? 'Postponed' : 'Skipped'}</strong>
                    <small>{formatTime(entry.resolvedAt ?? entry.dueAt)}</small>
                  </span>
                  <span className="mini-list-meta">{entry.durationSec ? `${entry.durationSec}s` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent sessions"
            subtitle="Newest first"
            action={
              <Link to="/analytics" className="link-button">
                All analytics <Icon name="ChevronRight" size={14} />
              </Link>
            }
          />
          {sessions.length === 0 ? (
            <EmptyState
              compact
              icon="ScanFace"
              title="No saved sessions"
              description="Stop a monitoring session to save its summary here."
            />
          ) : (
            <ul className="mini-list">
              {sessions.slice(0, 4).map((session) => (
                <li key={session.id}>
                  <span className="mini-list-icon">
                    <Icon name="Eye" size={14} />
                  </span>
                  <span className="mini-list-main">
                    <strong>{formatDuration(session.monitoredMs)} monitored</strong>
                    <small>{formatRelative(session.endedAt)}</small>
                  </span>
                  <span className="mini-list-meta">
                    {session.blinkCount} blinks · {formatRate(session.averageBlinkRate)}/min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="page-footnote">
        <Icon name="Info" size={14} /> A single session's blink rate varies with focus, lighting and camera angle.
        Compare your own days instead of chasing a universal target.
      </p>
    </div>
  );
}
