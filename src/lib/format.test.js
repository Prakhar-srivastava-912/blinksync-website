import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatPercent, formatRate, formatRelative, pad } from './format.js';

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45000)).toBe('45s');
    expect(formatDuration(125000)).toBe('2m 05s');
    expect(formatDuration(3723000)).toBe('1h 02m 03s');
  });

  it('can hide seconds', () => {
    expect(formatDuration(3723000, { showSeconds: false })).toBe('1h 02m');
    expect(formatDuration(125000, { showSeconds: false })).toBe('2m');
  });

  it('guards invalid input', () => {
    expect(formatDuration(undefined)).toBe('0s');
    expect(formatDuration(-5000)).toBe('0s');
  });
});

describe('formatClock', () => {
  it('renders countdown style values', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(20)).toBe('00:20');
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(3661)).toBe('1:01:01');
  });

  it('rounds up partial seconds and clamps negatives', () => {
    expect(formatClock(0.4)).toBe('00:01');
    expect(formatClock(-10)).toBe('00:00');
  });
});

describe('misc formatters', () => {
  it('formats rates and percentages', () => {
    expect(formatRate(12.345)).toBe('12.3');
    expect(formatRate(null)).toBe('0.0');
    expect(formatPercent(0.666)).toBe('67%');
  });

  it('formats relative times', () => {
    const now = 1000000000;
    expect(formatRelative(now, now)).toBe('just now');
    expect(formatRelative(now - 5000, now)).toBe('just now');
    expect(formatRelative(now - 120000, now)).toBe('2 min ago');
    expect(formatRelative(now - 7200000, now)).toBe('2 h ago');
    expect(formatRelative(now - 86400000, now)).toBe('yesterday');
  });

  it('pads numbers', () => {
    expect(pad(3)).toBe('03');
    expect(pad(30)).toBe('30');
  });
});
