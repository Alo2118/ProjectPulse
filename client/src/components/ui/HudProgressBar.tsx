import React, { useMemo } from 'react';

interface HudProgressBarProps {
  value: number;
  segments?: number;
  color?: 'cyan' | 'amber' | 'red' | 'emerald';
  showLabel?: boolean;
  size?: 'sm' | 'md';
  animate?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; glow: string; text: string }> = {
  cyan: { bg: 'bg-cyan-400', glow: '0 0 6px rgba(6,182,212,0.4)', text: 'text-cyan-400' },
  amber: { bg: 'bg-amber-400', glow: '0 0 6px rgba(251,191,36,0.4)', text: 'text-amber-400' },
  red: { bg: 'bg-red-400', glow: '0 0 6px rgba(239,68,68,0.4)', text: 'text-red-400' },
  emerald: { bg: 'bg-emerald-400', glow: '0 0 6px rgba(52,211,153,0.4)', text: 'text-emerald-400' },
};

export const HudProgressBar: React.FC<HudProgressBarProps> = ({
  value,
  segments = 10,
  color = 'cyan',
  showLabel = false,
  size = 'sm',
  animate = true,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const activeCount = Math.round((clampedValue / 100) * segments);
  const colors = COLOR_MAP[color];
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-3';

  const segmentElements = useMemo(() => {
    return Array.from({ length: segments }, (_, i) => {
      const isActive = i < activeCount;
      return (
        <div
          key={i}
          className={`flex-1 rounded-sm transition-all duration-200 ${heightClass} ${
            isActive ? colors.bg : 'bg-slate-700/30'
          }`}
          style={{
            boxShadow: isActive ? colors.glow : undefined,
            opacity: animate && isActive ? 0 : undefined,
            animation: animate && isActive
              ? `fade-in-stagger 0.2s ease-out ${i * 50}ms forwards`
              : undefined,
          }}
        />
      );
    });
  }, [segments, activeCount, colors, heightClass, animate]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px] flex-1">
        {segmentElements}
      </div>
      {showLabel && (
        <span className={`font-mono text-xs ${colors.text} tabular-nums min-w-[3ch] text-right`}>
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
};
