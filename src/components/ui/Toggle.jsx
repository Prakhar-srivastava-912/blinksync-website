export default function Toggle({ checked, onChange, label, description, id, disabled = false }) {
  const inputId = id ?? `toggle-${(label ?? 'option').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`toggle-row${disabled ? ' is-disabled' : ''}`}>
      <div className="toggle-copy">
        <label className="toggle-label" htmlFor={inputId}>
          {label}
        </label>
        {description ? <p className="toggle-description">{description}</p> : null}
      </div>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
