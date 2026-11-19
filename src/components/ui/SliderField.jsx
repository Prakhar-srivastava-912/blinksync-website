export default function SliderField({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  formatValue,
  help,
  id,
  disabled = false,
}) {
  const inputId = id ?? `slider-${(label ?? 'value').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <div className="field-label-row">
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <span className="field-value">{display}</span>
      </div>
      <input
        id={inputId}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}
