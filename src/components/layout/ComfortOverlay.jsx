import { useApp } from '../../context/AppContext.jsx';

/**
 * A warm tint applied only inside BlinkSync. Browsers cannot change the operating
 * system's display temperature, and the UI copy says so explicitly.
 */
export default function ComfortOverlay() {
  const { settings } = useApp();
  if (!settings.comfortMode) return null;

  return (
    <div
      className="comfort-overlay"
      aria-hidden="true"
      style={{ '--comfort-alpha': settings.comfortIntensity }}
    />
  );
}
