import { REMINDER_MESSAGES, REMINDER_PRESETS } from './constants.js';

/**
 * Decides when a low-blink nudge is appropriate. Kept independent from React so
 * the reminder cadence can be unit tested.
 */
export class BlinkReminderEngine {
  constructor({
    thresholdPerMinute = 12,
    cooldownMs = 180000,
    warmupMs = 45000,
    messages = REMINDER_MESSAGES,
  } = {}) {
    this.thresholdPerMinute = thresholdPerMinute;
    this.cooldownMs = cooldownMs;
    this.warmupMs = warmupMs;
    this.messages = messages;
    this.lastDeliveredAt = null;
    this.messageIndex = 0;
  }

  configure({ thresholdPerMinute, cooldownMs, warmupMs } = {}) {
    if (Number.isFinite(thresholdPerMinute) && thresholdPerMinute > 0) {
      this.thresholdPerMinute = thresholdPerMinute;
    }
    if (Number.isFinite(cooldownMs) && cooldownMs >= 0) this.cooldownMs = cooldownMs;
    if (Number.isFinite(warmupMs) && warmupMs >= 0) this.warmupMs = warmupMs;
  }

  reset() {
    this.lastDeliveredAt = null;
  }

  /**
   * @returns {{message: string, rate: number, at: number}|null}
   */
  evaluate({
    now,
    rate,
    facePresent,
    enabled = true,
    sessionStartedAt,
    observedMs = 0,
    minObservedMs = 45000,
  }) {
    if (!enabled || !facePresent) return null;
    if (!Number.isFinite(now) || !Number.isFinite(rate)) return null;
    if (observedMs < Math.max(minObservedMs, this.warmupMs)) return null;
    if (Number.isFinite(sessionStartedAt) && now - sessionStartedAt < this.warmupMs) return null;
    if (rate >= this.thresholdPerMinute) return null;
    if (this.lastDeliveredAt !== null && now - this.lastDeliveredAt < this.cooldownMs) return null;

    this.lastDeliveredAt = now;
    const message = this.messages[this.messageIndex % this.messages.length];
    this.messageIndex += 1;
    return { message, rate, at: now };
  }
}

export function reminderConfigFor(sensitivity) {
  const preset = REMINDER_PRESETS[sensitivity] ?? REMINDER_PRESETS.balanced;
  return {
    thresholdPerMinute: preset.thresholdPerMinute,
    cooldownMs: preset.cooldownSec * 1000,
  };
}
