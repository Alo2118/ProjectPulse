import React, { useMemo } from 'react';

interface HudGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: 'cyan' | 'amber' | 'red' | 'emerald';
  label?: string;
  showValue?: boolean;
}

const COLOR_MAP: Record<string, { stroke: string; glow: string; text: string }> = {
  cyan: { stroke: '#06b6d4', glow: 'rgba(6,182,212,0.4)', text: 'text-cyan-400' },
  amber: { stroke: '#fbbf24', glow: 'rgba(251,191,36,0.4)', text: 'text-amber-400' },
  red: { stroke: '#f87171', glow: 'rgba(239,68,68,0.4)', text: 'text-red-400' },
  emerald: { stroke: '#34d399', glow: 'rgba(52,211,153,0.4)', text: 'text-emerald-400' },
};

export const HudGauge: React.FC<HudGaugeProps> = ({
  value,
  size = 80,
  strokeWidth = 4,
  color = 'cyan',
  label,
  showValue = true,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const colors = COLOR_MAP[color];
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  const gradientId = `gauge-grad-${color}`;
  const filterId = `gauge-glow-${color}`;

  const tickMarks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      const innerR = radius - 6;
      const outerR = radius - 2;
      ticks.push(
        <line
          key={i}
          x1={center + innerR * Math.cos(angle)}
          y1={center + innerR * Math.sin(angle)}
          x2={center + outerR * Math.cos(angle)}
          y2={center + outerR * Math.sin(angle)}
          stroke="rgba(6,182,212,0.15)"
          strokeWidth="1"
        />
      );
    }
    return ticks;
  }, [center, radius]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <filter id={filterId}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={colors.glow} />
          </filter>
        </defs>

        {/* Tick marks */}
        {tickMarks}

        {/* Background circle (dashed) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(6,182,212,0.1)"
          strokeWidth={strokeWidth}
          strokeDasharray="4 2"
        />

        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          filter={`url(#${filterId})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />

        {/* Center text */}
        {showValue && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            className={`font-mono font-bold ${colors.text}`}
            fontSize={size * 0.22}
            fill="currentColor"
          >
            {Math.round(clampedValue)}
          </text>
        )}
      </svg>
      {label && (
        <span className="text-xs uppercase tracking-widest text-cyan-500/50 font-medium">
          {label}
        </span>
      )}
    </div>
  );
};
