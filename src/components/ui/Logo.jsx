export default function Logo({ size = 36, withWordmark = true, tagline = false }) {
  return (
    <span className="brand">
      <span className="brand-mark" style={{ width: size, height: size }}>
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M5 24c5.2-8.6 11.5-12.9 19-12.9S37.8 15.4 43 24c-5.2 8.6-11.5 12.9-19 12.9S10.2 32.6 5 24Z"
            stroke="url(#brand-grad)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="24" r="6.6" fill="url(#brand-grad)" />
          <circle cx="24" cy="24" r="2.6" fill="#04101f" />
          <circle cx="26.6" cy="21.5" r="1.5" fill="#eafaff" />
          <defs>
            <linearGradient id="brand-grad" x1="6" y1="12" x2="42" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      {withWordmark ? (
        <span className="brand-text">
          <span className="brand-name">
            Blink<span className="brand-name-accent">Sync</span>
          </span>
          {tagline ? <span className="brand-tagline">AI eye care companion</span> : null}
        </span>
      ) : null}
    </span>
  );
}
