import Icon from './Icon.jsx';

export default function StatTile({ icon, label, value, unit, hint, tone = 'cyan', badge = null }) {
  return (
    <article className={`stat-tile stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">
          <Icon name={icon} size={18} />
        </span>
        {badge}
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">
        {value}
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}
