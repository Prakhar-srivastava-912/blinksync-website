export const BREAK_EVENTS = {
  DUE: 'break-due',
  COMPLETE: 'break-complete',
  START: 'break-start',
  SNOOZE: 'break-snooze',
  SKIP: 'break-skip',
};

/**
 * Pure 20-20-20 scheduler. Screen time is accumulated only while the app is
 * visible and screen tracking is active; the scheduler never uses wall-clock
 * elapsed time for the interval so a background tab cannot trigger fake breaks.
 */
export class BreakScheduler {
  constructor({ intervalMs = 20 * 60 * 1000, durationMs = 20 * 1000, snoozeMs = 5 * 60 * 1000 } = {}) {
    this.intervalMs = intervalMs;
    this.durationMs = durationMs;
    this.snoozeMs = snoozeMs;
    this.reset();
  }

  reset() {
    this.phase = 'idle';
    this.activeMs = 0;
    this.breakEndsAt = null;
    this.breakStartedAt = null;
    this.lastTickAt = null;
    this.pendingDueAt = null;
    this.completedBreaks = 0;
  }

  configure({ intervalMs, durationMs, snoozeMs } = {}) {
    if (Number.isFinite(intervalMs) && intervalMs >= 5000) {
      this.intervalMs = intervalMs;
      this.activeMs = Math.min(this.activeMs, intervalMs);
    }
    if (Number.isFinite(durationMs) && durationMs >= 3000) this.durationMs = durationMs;
    if (Number.isFinite(snoozeMs) && snoozeMs >= 1000) this.snoozeMs = snoozeMs;
  }

  /** Remove accumulated time (e.g. while break reminders are switched off). */
  clearActiveTime() {
    this.activeMs = 0;
    if (this.phase === 'due') this.phase = 'idle';
  }

  status(now = Date.now()) {
    const breakRemainingMs =
      this.phase === 'break' && this.breakEndsAt !== null ? Math.max(0, this.breakEndsAt - now) : 0;
    const remainingMs =
      this.phase === 'break' ? 0 : Math.max(0, this.intervalMs - this.activeMs);

    return {
      phase: this.phase,
      activeMs: Math.round(this.activeMs),
      intervalMs: this.intervalMs,
      durationMs: this.durationMs,
      snoozeMs: this.snoozeMs,
      remainingMs: Math.round(remainingMs),
      breakRemainingMs: Math.round(breakRemainingMs),
      progress: Math.min(1, this.intervalMs > 0 ? this.activeMs / this.intervalMs : 0),
      breakProgress:
        this.phase === 'break' && this.durationMs > 0
          ? Math.min(1, Math.max(0, 1 - breakRemainingMs / this.durationMs))
          : 0,
      completedBreaks: this.completedBreaks,
      pendingDueAt: this.pendingDueAt,
    };
  }

  /**
   * @returns {string|null} one of BREAK_EVENTS, emitted at most once per tick.
   */
  tick(now, { screenActive = true, deltaLimitMs = 2000 } = {}) {
    if (!Number.isFinite(now)) return null;

    if (this.phase === 'break') {
      this.lastTickAt = now;
      if (this.breakEndsAt !== null && now >= this.breakEndsAt) {
        this.phase = 'idle';
        this.activeMs = 0;
        this.breakEndsAt = null;
        this.breakStartedAt = null;
        this.completedBreaks += 1;
        return BREAK_EVENTS.COMPLETE;
      }
      return null;
    }

    const previous = this.lastTickAt === null ? now : this.lastTickAt;
    this.lastTickAt = now;

    if (this.phase === 'due') return null;

    if (screenActive) {
      this.activeMs += Math.min(Math.max(now - previous, 0), deltaLimitMs);
    }

    if (this.activeMs >= this.intervalMs) {
      this.phase = 'due';
      this.pendingDueAt = this.pendingDueAt ?? now;
      return BREAK_EVENTS.DUE;
    }

    return null;
  }

  /** Force the break modal open from a UI button. */
  forceBreak(now) {
    if (this.phase !== 'idle') return null;
    this.phase = 'due';
    this.pendingDueAt = now;
    return BREAK_EVENTS.DUE;
  }

  startBreak(now) {
    if (this.phase !== 'due') return null;
    this.phase = 'break';
    this.breakStartedAt = now;
    this.breakEndsAt = now + this.durationMs;
    return BREAK_EVENTS.START;
  }

  snooze(now) {
    if (this.phase !== 'due') return null;
    const dueAt = this.pendingDueAt;
    this.phase = 'idle';
    this.activeMs = Math.max(0, this.intervalMs - this.snoozeMs);
    this.lastTickAt = now;
    this.pendingDueAt = null;
    return { event: BREAK_EVENTS.SNOOZE, dueAt };
  }

  skip(now) {
    if (this.phase !== 'due') return null;
    const dueAt = this.pendingDueAt;
    this.phase = 'idle';
    this.activeMs = 0;
    this.lastTickAt = now;
    this.pendingDueAt = null;
    return { event: BREAK_EVENTS.SKIP, dueAt };
  }

  /** Close a running break early (counts as completed only when full length). */
  endBreak(now) {
    if (this.phase !== 'break') return null;
    const completed = this.breakEndsAt !== null && now >= this.breakEndsAt - 250;
    this.phase = 'idle';
    this.activeMs = 0;
    this.breakEndsAt = null;
    this.breakStartedAt = null;
    if (completed) {
      this.completedBreaks += 1;
      return BREAK_EVENTS.COMPLETE;
    }
    return BREAK_EVENTS.SKIP;
  }
}
