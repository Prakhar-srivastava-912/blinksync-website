import { useMemo, useState } from 'react';
import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import { buildAnalytics } from '../lib/analytics.js';
import { PERIODS } from '../lib/constants.js';
import { formatDateTime, formatDuration, formatNumber, formatPercent, formatRate } from '../lib/format.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import StatTile from '../components/ui/StatTile.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { ActivityChart, BreaksChart, ChartCard, RateTrendChart, SessionsChart } from '../components/charts/Charts.jsx';

const PERIOD_OPTIONS = PERIODS.map((period) => ({ value: period.id, label: period.label }));

export default function AnalyticsPage() {
  const { sessions, demoSessions, breaks, exportData } = useApp();
  const [period, setPeriod] = useState('7d');
  const [source, setSource] = useState('live');

  const hasDemo = demoSessions.length > 0;
  const activeSessions = source === 'demo' ? demoSessions : sessions;
  const activeBreaks = useMemo(
    () => breaks.filter((entry) => (source === 'demo' ? entry.simulated : !entry.simulated)),
    [breaks, source],
  );
  const analytics = useMemo(
    () => buildAnalytics({ sessions: activeSessions, breaks: activeBreaks, period }),
    [activeSessions, activeBreaks, period],
  );

  const lowRateSessions = activeSessions.filter((session) => session.averageBlinkRate > 0 && session.averageBlinkRate < 10);
  const sourceOptions = hasDemo
    ? [
        { value: 'live', label: 'My sessions' },
        { value: 'demo', label: 'Demo data' },
      ]
    : [{ value: 'live', label: 'My sessions' }];

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Eye activity analytics"
        title="Patterns from your own sessions"
        description="Blink rate, monitored time and break completion across your selected period. No synthetic numbers are mixed in."
        actions={
          <div className="header-actions">
            {hasDemo ? (
              <Segmented options={sourceOptions} value={source} onChange={setSource} label="Data source" size="sm" />
            ) : null}
            <Button variant="secondary" icon="Download" onClick={exportData}>
              Export JSON
            </Button>
          </div>
        }
      />

      {source === 'demo' ? (
        <div className="inline-note inline-note-demo">
          <Icon name="Sparkles" size={15} />
          Showing simulated demo data only. It is stored under a separate key and can be cleared from the Monitoring
          page. Demo sessions never count toward achievements.
        </div>
      ) : null}

      <div className="section-header-row">
        <div>
          <h2 className="section-title-sm">Overview</h2>
          <p className="section-sub">
            {activeSessions.length} stored session{activeSessions.length === 1 ? '' : 's'} in this browser
          </p>
        </div>
        <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} label="Analytics period" size="sm" />
      </div>

      {analytics.empty ? (
        <Card>
          <EmptyState
            icon="BarChart3"
            title="Nothing in this period yet"
            description="Switch the period, run a new session, or load clearly-labelled demo data to see how the charts behave."
            action={
              <div className="btn-row">
                <Link to="/monitor" className="btn btn-primary btn-sm">
                  Start monitoring
                </Link>
                {hasDemo ? (
                  <Button size="sm" variant="ghost" icon="Sparkles" onClick={() => setSource('demo')}>
                    View demo data
                  </Button>
                ) : null}
              </div>
            }
          />
        </Card>
      ) : null}

      <div className="stat-grid">
        <StatTile
          icon="ScanFace"
          label="Sessions"
          value={formatNumber(analytics.totals.sessions)}
          hint={`Avg ${formatDuration(analytics.totals.averageSessionMs, { showSeconds: false })} monitored`}
          tone="sky"
        />
        <StatTile
          icon="Eye"
          label="Blinks tracked"
          value={formatNumber(analytics.totals.blinkCount)}
          hint={analytics.totals.bestDayLabel ? `Best day: ${analytics.totals.bestDayLabel}` : 'No standout day yet'}
          tone="cyan"
        />
        <StatTile
          icon="Activity"
          label="Average blink rate"
          value={formatRate(analytics.totals.averageBlinkRate)}
          unit="/min"
          hint="Weighted by monitored time"
          tone="teal"
        />
        <StatTile
          icon="Timer"
          label="Monitoring time"
          value={formatDuration(analytics.totals.monitoredMs, { showSeconds: false })}
          hint={`Longest session ${formatDuration(analytics.totals.longestSessionMs, { showSeconds: false })}`}
          tone="violet"
        />
        <StatTile
          icon="Coffee"
          label="Breaks completed"
          value={formatNumber(analytics.totals.breaksCompleted)}
          hint={`${analytics.totals.breaksDue} due in period`}
          tone="amber"
        />
        <StatTile
          icon="Target"
          label="Break completion"
          value={
            analytics.totals.breaksDue > 0
              ? formatPercent(analytics.totals.breakCompletionRate)
              : '—'
          }
          hint={
            analytics.totals.breaksDue > 0
              ? 'Completed ÷ breaks that came due'
              : 'No break reminders resolved yet'
          }
          tone="rose"
        />
      </div>

      <div className="chart-grid">
        <ChartCard
          title={analytics.activityTitle}
          subtitle={analytics.activityUnit === 'timeline' ? 'Sampled during your latest session' : 'Blinks per day'}
          empty={analytics.activity.length === 0}
        >
          <ActivityChart data={analytics.activity} unit={analytics.activityUnit} height={260} />
        </ChartCard>

        <ChartCard
          title="Blink-rate trend"
          subtitle="Daily average blinks per minute"
          empty={analytics.rateTrend.every((day) => day.rate === 0)}
        >
          <RateTrendChart data={analytics.rateTrend} height={260} />
        </ChartCard>

        <ChartCard
          title="Daily monitoring sessions"
          subtitle="Session count per day"
          empty={analytics.sessionBars.every((day) => day.sessions === 0)}
        >
          <SessionsChart data={analytics.sessionBars} height={260} />
        </ChartCard>

        <ChartCard
          title="Break completion"
          subtitle="Completed vs due per day"
          empty={analytics.breakBars.every((day) => day.due === 0)}
        >
          <BreaksChart data={analytics.breakBars} height={260} />
        </ChartCard>
      </div>

      <div className="grid cols-2 analytics-lower">
        <Card>
          <CardHeader title="What the data suggests" subtitle="Read these as prompts for reflection, not medical advice." />
          <ul className="insight-list">
            <li>
              <span className="insight-icon">
                <Icon name="Activity" size={16} />
              </span>
              <p>
                Your average blink rate in this period was{' '}
                <strong>{analytics.totals.averageBlinkRate > 0 ? `${formatRate(analytics.totals.averageBlinkRate)} per minute` : 'not available yet'}</strong>
                {analytics.totals.sessions > 0 ? ' across monitored time.' : '.'}
              </p>
            </li>
            <li>
              <span className="insight-icon">
                <Icon name="Coffee" size={16} />
              </span>
              <p>
                {analytics.totals.breaksDue === 0
                  ? 'No break reminders have resolved in this period, so completion cannot be compared yet.'
                  : `You completed ${analytics.totals.breaksCompleted} of ${analytics.totals.breaksDue} breaks (${formatPercent(
                      analytics.totals.breakCompletionRate,
                    )}).`}
              </p>
            </li>
            <li>
              <span className="insight-icon">
                <Icon name="TrendingDown" size={16} />
              </span>
              <p>
                {lowRateSessions.length === 0
                  ? 'No session fell below 10 blinks per minute in this period.'
                  : `${lowRateSessions.length} session${lowRateSessions.length === 1 ? '' : 's'} averaged under 10 blinks per minute. Personal baselines vary — use calibration and your comfort to judge.`}
              </p>
            </li>
            <li>
              <span className="insight-icon">
                <Icon name="Timer" size={16} />
              </span>
              <p>
                Longest monitored stretch was{' '}
                <strong>{formatDuration(analytics.totals.longestSessionMs)}</strong>. Break reminders can be shortened
                for demos, but 20-20-20 is a sensible everyday default.
              </p>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Recent sessions"
            subtitle="Saved locally · newest first"
            action={
              <Link to="/settings" className="link-button">
                Data controls <Icon name="ChevronRight" size={14} />
              </Link>
            }
          />
          {activeSessions.length === 0 ? (
            <EmptyState compact icon="ScanFace" title="No sessions stored" description="Stop a monitoring session to save it." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">Stored monitoring sessions</caption>
                <thead>
                  <tr>
                    <th scope="col">Started</th>
                    <th scope="col">Monitored</th>
                    <th scope="col">Blinks</th>
                    <th scope="col">Rate</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.slice(0, 8).map((session) => (
                    <tr key={session.id}>
                      <td>{formatDateTime(session.startedAt)}</td>
                      <td>{formatDuration(session.monitoredMs, { showSeconds: false })}</td>
                      <td>{formatNumber(session.blinkCount)}</td>
                      <td>{formatRate(session.averageBlinkRate)}/min</td>
                      <td>
                        <Badge tone={session.mode === 'demo' ? 'violet' : 'teal'}>
                          {session.mode === 'demo' ? 'Demo' : 'Live'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="page-footnote">
        <Icon name="Info" size={14} /> Blink rates measured from a webcam are estimates. Lighting, glasses, head pose and
        camera quality can shift the result; treat trends as a personal reference only.
      </p>
    </div>
  );
}
