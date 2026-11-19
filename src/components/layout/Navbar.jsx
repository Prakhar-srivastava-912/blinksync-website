import { useEffect, useState } from 'react';
import { Link, useRouter } from '../../lib/router.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useMonitor } from '../../context/MonitorContext.jsx';
import { formatDuration, formatRate } from '../../lib/format.js';
import Icon from '../ui/Icon.jsx';
import Logo from '../ui/Logo.jsx';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'Activity' },
  { to: '/monitor', label: 'Monitor', icon: 'ScanFace' },
  { to: '/analytics', label: 'Analytics', icon: 'BarChart3' },
  { to: '/breaks', label: 'Breaks', icon: 'Coffee' },
  { to: '/achievements', label: 'Achievements', icon: 'Trophy' },
];

const STATUS_LABELS = {
  idle: 'Idle',
  'requesting-camera': 'Camera…',
  initializing: 'Loading AI…',
  calibrating: 'Calibrating',
  running: 'Live',
  demo: 'Demo',
  paused: 'Paused',
  error: 'Attention',
};

export default function Navbar() {
  const { path } = useRouter();
  const { settings, updateSettings } = useApp();
  const monitor = useMonitor();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  const active = monitor.status === 'running' || monitor.status === 'demo';
  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand" aria-label="BlinkSync home">
          <Logo size={34} />
        </Link>

        <nav className={`navbar-links${menuOpen ? ' is-open' : ''}`} aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${path === link.to ? ' is-active' : ''}`}
              aria-current={path === link.to ? 'page' : undefined}
            >
              <Icon name={link.icon} size={16} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="navbar-actions">
          <Link
            to="/monitor"
            className={`status-pill status-${monitor.status}`}
            title={monitor.error?.message ?? 'Monitoring status'}
          >
            <span className={`status-dot${active ? ' is-active' : ''}`} aria-hidden="true" />
            <span className="status-text">{STATUS_LABELS[monitor.status] ?? 'Idle'}</span>
            {monitor.status === 'running' || monitor.status === 'demo' ? (
              <span className="status-meta">
                {formatRate(monitor.blinkRate)}/min · {formatDuration(monitor.durationMs, { showSeconds: false })}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            className="btn btn-ghost btn-icon navbar-icon-btn"
            onClick={toggleTheme}
            aria-label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <Icon name={settings.theme === 'dark' ? 'Sun' : 'Moon'} size={18} />
          </button>

          <Link
            to="/settings"
            className={`btn btn-ghost btn-icon navbar-icon-btn${path === '/settings' ? ' is-active' : ''}`}
            aria-label="Settings"
            title="Settings"
          >
            <Icon name="Settings" size={18} />
          </Link>

          <button
            type="button"
            className="btn btn-ghost btn-icon navbar-burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={menuOpen ? 'X' : 'Menu'} size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
