import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'Sparkles', title, description, action, compact = false }) {
  return (
    <div className={`empty-state${compact ? ' empty-state-compact' : ''}`}>
      <span className="empty-icon">
        <Icon name={icon} size={compact ? 20 : 26} />
      </span>
      <div>
        <h3 className="empty-title">{title}</h3>
        {description ? <p className="empty-description">{description}</p> : null}
        {action ? <div className="empty-action">{action}</div> : null}
      </div>
    </div>
  );
}
