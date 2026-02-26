import React from 'react';

interface HudStatusRingProps {
  status: 'active' | 'warning' | 'danger' | 'idle';
  size?: number;
  pulse?: boolean;
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  active: { fill: '#06b6d4', stroke: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  warning: { fill: '#fbbf24', stroke: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
  danger: { fill: '#f87171', stroke: '#f87171', glow: 'rgba(239,68,68,0.4)' },
  idle: { fill: '#64748b', stroke: '#64748b', glow: 'rgba(100,116,139,0.2)' },
};

export const HudStatusRing: React.FC<HudStatusRingProps> = ({
  status,
  size = 14,
  pulse,
}) => {
  const colors = STATUS_COLORS[status];
  const shouldPulse = pulse ?? (status === 'active' || status === 'danger');
  const filterId = `status-glow-${status}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={`inline-block flex-shrink-0 ${shouldPulse ? 'animate-glow-pulse' : ''}`}
    >
      <defs>
        <filter id={filterId}>
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={colors.glow} />
        </filter>
      </defs>

      {/* Outer ring (rotating, dashed) */}
      <circle
        cx="7"
        cy="7"
        r="5"
        fill="none"
        stroke={colors.stroke}
        strokeWidth="1"
        strokeDasharray="8 4"
        strokeOpacity="0.6"
        filter={`url(#${filterId})`}
        className="animate-ring-spin origin-center"
      />

      {/* Center dot */}
      <circle
        cx="7"
        cy="7"
        r="2"
        fill={colors.fill}
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};
