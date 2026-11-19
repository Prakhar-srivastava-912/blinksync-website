export default function Badge({ children, tone = 'default', dot = false, className = '', ...rest }) {
  return (
    <span className={`badge badge-${tone}${className ? ` ${className}` : ''}`} {...rest}>
      {dot ? <span className="badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function LiveDot({ tone = 'success', label = 'Live' }) {
  return (
    <span className={`live-dot live-dot-${tone}`}>
      <span className="live-dot-pulse" aria-hidden="true" />
      {label}
    </span>
  );
}
