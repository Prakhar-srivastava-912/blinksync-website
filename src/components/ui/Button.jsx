import Icon from './Icon.jsx';

/** Shared class builder so anchors can look identical to buttons. */
export function buttonClass(variant = 'primary', size = 'md', extra = '') {
  return ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '', extra]
    .filter(Boolean)
    .join(' ');
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  );
}
