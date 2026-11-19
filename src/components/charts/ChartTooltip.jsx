function formatValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value ?? '—';
  return Number.isInteger(value) ? value : value.toFixed(1);
}

export default function ChartTooltip({ active, payload, label, unitMap = {} }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload ?? {};
  const seen = new Set();

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <ul className="chart-tooltip-list">
        {payload.map((entry, index) => {
          const key = entry.dataKey ?? `${entry.name}-${index}`;
          if (seen.has(key)) return null;
          seen.add(key);
          return (
            <li key={key}>
              <span className="chart-tooltip-dot" style={{ background: entry.color }} aria-hidden="true" />
              <span>{entry.name}</span>
              <strong>
                {formatValue(entry.value)}
                {unitMap[entry.dataKey] ?? ''}
              </strong>
            </li>
          );
        })}
      </ul>
      {point.blinks !== undefined && !payload.some((entry) => entry.dataKey === 'blinks') ? (
        <p className="chart-tooltip-extra">Blinks recorded: {point.blinks}</p>
      ) : null}
      {point.minutes !== undefined && !payload.some((entry) => entry.dataKey === 'minutes') ? (
        <p className="chart-tooltip-extra">Monitoring: {point.minutes} min</p>
      ) : null}
      {point.due !== undefined && !payload.some((entry) => entry.dataKey === 'due') ? (
        <p className="chart-tooltip-extra">Breaks due: {point.due}</p>
      ) : null}
    </div>
  );
}
