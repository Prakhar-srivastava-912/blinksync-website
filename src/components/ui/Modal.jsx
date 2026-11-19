import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

export default function Modal({ open, onClose, title, description, children, footer, tone = 'default', dismissible = true }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousActive = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && dismissible) onClose?.();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]');
      target?.focus?.();
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
      if (previousActive instanceof HTMLElement) previousActive.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <div className={`modal modal-${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}>
        <div className="modal-head">
          <h2 id={titleId} className="modal-title">
            {title}
          </h2>
          {dismissible ? (
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close dialog">
              <Icon name="X" size={18} />
            </button>
          ) : null}
        </div>
        {description ? <p className="modal-description">{description}</p> : null}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
