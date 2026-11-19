/** Human-readable, compact duration from milliseconds. */
export function formatDuration(ms, { showSeconds = true } = {}) {
  const total = Math.max(0, Math.round(Number(ms) || 0) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);

  if (hours > 0) {
    return showSeconds ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${hours}h ${pad(minutes)}m`;
  }
  if (minutes > 0) {
    return showSeconds ? `${minutes}m ${pad(seconds)}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** Chronometer-style mm:ss (or h:mm:ss) for countdowns. */
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(rest)}`;
  return `${pad(minutes)}:${pad(rest)}`;
}

export function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0';
  return number >= 100 ? number.toFixed(0) : number.toFixed(1);
}

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(number);
}

export function formatPercent(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${(number * 100).toFixed(digits)}%`;
}

export function formatTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '—';
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(timestamp) {
  if (!Number.isFinite(timestamp)) return '—';
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayLabel(timestamp) {
  if (!Number.isFinite(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatRelative(timestamp, now = Date.now()) {
  if (!Number.isFinite(timestamp)) return '—';
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function pad(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0');
}
