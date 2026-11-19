import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Icon from '../ui/Icon.jsx';
import ChartTooltip from './ChartTooltip.jsx';

const AXIS_PROPS = {
  stroke: 'transparent',
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11 },
};

export function ChartCard({ title, subtitle, children, empty, emptyTitle, emptyDescription, action, icon }) {
  return (
    <Card className="chart-card">
      <header className="card-header">
        <div className="card-heading">
          <h3 className="card-title">
            {icon ? <Icon name={icon} size={17} /> : null}
            {title}
          </h3>
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="card-action">{action}</div> : null}
      </header>
      {empty ? (
        <EmptyState compact icon="BarChart3" title={emptyTitle ?? 'Nothing to chart yet'} description={emptyDescription} />
      ) : (
        <div className="chart-surface">{children}</div>
      )}
    </Card>
  );
}

export function ActivityChart({ data, unit, empty, height = 240 }) {
  const isTimeline = unit === 'timeline';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
        <YAxis {...AXIS_PROPS} width={52} allowDecimals={false} />
        <Tooltip
          content={<ChartTooltip unitMap={isTimeline ? { rate: ' bpm' } : {}} />}
          cursor={{ stroke: 'rgba(34, 211, 238, 0.28)' }}
        />
        <Area
          type="monotone"
          dataKey={isTimeline ? 'rate' : 'blinks'}
          name={isTimeline ? 'Blinks / min' : 'Blinks'}
          stroke="#22d3ee"
          strokeWidth={2.2}
          fill="url(#activity-fill)"
          activeDot={{ r: 4, fill: '#22d3ee' }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RateTrendChart({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
        <YAxis {...AXIS_PROPS} width={52} />
        <Tooltip content={<ChartTooltip unitMap={{ rate: ' bpm' }} />} cursor={{ stroke: 'rgba(45,212,191,0.3)' }} />
        <Line
          type="monotone"
          dataKey="rate"
          name="Avg blink rate"
          stroke="#2dd4bf"
          strokeWidth={2.4}
          dot={{ r: 2.5, fill: '#2dd4bf', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SessionsChart({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={12} />
        <YAxis {...AXIS_PROPS} width={52} allowDecimals={false} />
        <Tooltip content={<ChartTooltip unitMap={{ sessions: '' }} />} cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }} />
        <Bar dataKey="sessions" name="Sessions" fill="#38bdf8" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BreaksChart({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={12} />
        <YAxis {...AXIS_PROPS} width={52} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(45, 212, 191, 0.08)' }} />
        <Bar dataKey="completed" name="Completed" fill="#2dd4bf" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="due" name="Due" fill="rgba(139, 163, 189, 0.35)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
