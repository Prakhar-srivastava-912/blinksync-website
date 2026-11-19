export default function SelectField({ label, value, onChange, options = [], help, id, disabled = false }) {
  const selectId = id ?? `select-${(label ?? 'option').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <label className="field-label" htmlFor={selectId}>
        {label}
      </label>
      <div className="select-wrap">
        <select
          id={selectId}
          className="select"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}
