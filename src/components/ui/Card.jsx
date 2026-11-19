export default function Card({ children, className = '', as: Component = 'section', padded = true, ...rest }) {
  return (
    <Component className={`card${padded ? ' card-pad' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, subtitle, action, icon }) {
  return (
    <header className="card-header">
      <div className="card-heading">
        <h3 className="card-title">{title}</h3>
        {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="card-action">{action}</div> : null}
      {icon ? <span className="card-icon">{icon}</span> : null}
    </header>
  );
}
