export default function Segmented({ options, value, onChange, label, size = 'md', className = '' }) {
  return (
    <div className={`segmented segmented-${size}${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented-item${option.value === value ? ' is-active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
