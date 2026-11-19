import { useApp } from '../../context/AppContext.jsx';
import Icon from './Icon.jsx';

export default function Toaster() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-icon">
            <Icon name={toast.icon ?? 'Info'} size={17} />
          </span>
          <p className="toast-message">{toast.message}</p>
          <button type="button" className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
            <Icon name="X" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
