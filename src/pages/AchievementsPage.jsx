import { useMemo } from 'react';
import { Link } from '../lib/router.jsx';
import { useApp } from '../context/AppContext.jsx';
import { achievementStats } from '../lib/achievements.js';
import { activeDayCount, dayStreak } from '../lib/analytics.js';
import { formatDateTime, formatDuration, formatPercent } from '../lib/format.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ProgressRing from '../components/ui/ProgressRing.jsx';

export default function AchievementsPage() {
  const { achievements, sessions, breaks, settings, unlocked } = useApp();
  const stats = achievementStats(achievements);
  const completedBreaks = breaks.filter((entry) => entry.status === 'completed' && !entry.simulated).length;
  const streak = dayStreak(sessions);
  const activeDays = activeDayCount(sessions);
  const totalBlinks = sessions.reduce((total, session) => total + (session.blinkCount ?? 0), 0);

  const nextAchievement = useMemo(
    () =>
      [...achievements]
        .filter((achievement) => !achievement.unlocked)
        .sort((a, b) => b.percent - a.percent)[0],
    [achievements],
  );

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Achievement centre"
        title="Rewards for looking after your eyes"
        description="Every badge here is earned by awareness, breaks or consistency — never by spending longer in front of the screen."
      />

      <div className="achievement-summary">
        <Card className="achievement-summary-card">
          <ProgressRing progress={stats.percent} size={132} stroke={11} label={`${stats.earned} of ${stats.total} badges earned`}>
            <span className="ring-seconds ring-seconds-sm">
              {stats.earned}/{stats.total}
            </span>
            <span className="ring-caption">badges</span>
          </ProgressRing>
          <div>
            <p className="eyebrow">Your progress</p>
            <h2 className="section-title-sm">
              {stats.earned === stats.total
                ? 'Every badge unlocked. Your eyes appreciate it.'
                : nextAchievement
                  ? `Next up: ${nextAchievement.title}`
                  : 'Start monitoring to earn your first badge'}
            </h2>
            {nextAchievement ? (
              <>
                <p className="section-sub">{nextAchievement.hint}</p>
                <div className="progress-bar achievement-progress" aria-hidden="true">
                  <span style={{ width: `${Math.round(nextAchievement.percent * 100)}%` }} />
                </div>
                <p className="achievement-progress-label">
                  {nextAchievement.current} / {nextAchievement.target} · {formatPercent(nextAchievement.percent)}
                </p>
              </>
            ) : null}
            <div className="achievement-summary-stats">
              <span>
                <strong>{streak}</strong> day streak
              </span>
              <span>
                <strong>{activeDays}</strong> active days
              </span>
              <span>
                <strong>{completedBreaks}</strong> breaks
              </span>
              <span>
                <strong>{totalBlinks}</strong> blinks tracked
              </span>
            </div>
          </div>
        </Card>

        {sessions.length === 0 ? (
          <Card>
            <EmptyState
              icon="Trophy"
              title="No sessions yet"
              description="Badges unlock from real activity. A 30-second session is enough for the first one."
              action={
                <Link to="/monitor" className="btn btn-primary btn-sm">
                  Start monitoring
                </Link>
              }
            />
          </Card>
        ) : (
          <Card>
            <CardHeader title="How rewards work" icon={<Icon name="ShieldCheck" size={18} />} />
            <ul className="check-list">
              <li>
                <Icon name="Check" size={16} /> Breaks and awareness earn badges; screen time never does.
              </li>
              <li>
                <Icon name="Check" size={16} /> Demo sessions are excluded from every achievement.
              </li>
              <li>
                <Icon name="Check" size={16} /> Unlocks are stored locally with their date, so they survive reloads.
              </li>
              <li>
                <Icon name="Check" size={16} /> Resetting statistics also resets achievements — you choose.
              </li>
            </ul>
            {!settings.calibration ? (
              <p className="inline-note">
                <Icon name="Focus" size={15} /> Calibrate once to unlock “Perfect Fit” and improve detection accuracy.
              </p>
            ) : null}
          </Card>
        )}
      </div>

      <div className="section-header-row">
        <div>
          <h2 className="section-title-sm">All badges</h2>
          <p className="section-sub">Progress updates automatically from stored sessions and break outcomes.</p>
        </div>
        <Badge tone="teal">{stats.earned} earned</Badge>
      </div>

      <div className="badge-grid">
        {achievements.map((achievement) => {
          const unlockedAt = unlocked?.[achievement.id] ?? achievement.unlockedAt;
          return (
            <article
              key={achievement.id}
              className={`achievement-card tone-${achievement.tone}${achievement.unlocked ? ' is-unlocked' : ' is-locked'}`}
            >
              <div className="achievement-head">
                <span className="achievement-icon">
                  <Icon name={achievement.icon} size={24} />
                </span>
                {achievement.unlocked ? (
                  <Badge tone="success">
                    <Icon name="Check" size={12} /> Earned
                  </Badge>
                ) : (
                  <Badge tone="muted">
                    <Icon name="Lock" size={12} /> Locked
                  </Badge>
                )}
              </div>
              <h3>{achievement.title}</h3>
              <p>{achievement.description}</p>
              <div className="achievement-meta">
                <span>
                  {achievement.current} / {achievement.target}
                </span>
                <span>{formatPercent(achievement.percent)}</span>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(achievement.percent * 100)}%` }} />
              </div>
              {achievement.unlocked && unlockedAt ? (
                <p className="achievement-date">Earned {formatDateTime(unlockedAt)}</p>
              ) : (
                <p className="achievement-date">{achievement.hint}</p>
              )}
            </article>
          );
        })}
      </div>

      <p className="page-footnote">
        <Icon name="Info" size={14} /> Streaks are based on local calendar days with at least a few seconds of
        monitored time. Missing a day never deletes saved sessions.
      </p>
    </div>
  );
}
