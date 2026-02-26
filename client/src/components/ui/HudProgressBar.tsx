import React, { useMemo } from 'react';
import { useThemeStore } from '@stores/themeStore';

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

/** Tailwind bg classes for non-HUD continuous bar fill */
const SIMPLE_BG_MAP: Record<string, string> = {
  cyan: 'bg-sky-500 dark:bg-sky-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  red: 'bg-red-500 dark:bg-red-400',
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
};

const SIMPLE_TEXT_MAP: Record<string, string> = {
  cyan: 'text-sky-600 dark:text-sky-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
};

export const HudProgressBar: React.FC<HudProgressBarProps> = ({
  value,
  segments = 10,
  color = 'cyan',
  showLabel = false,
  size = 'sm',
  animate = true,
}) => {
  const { themeStyle } = useThemeStore();
  const isHud = themeStyle === 'tech-hud';

  const clampedValue = Math.max(0, Math.min(100, value));
  const activeCount = Math.round((clampedValue / 100) * segments);
  const colors = COLOR_MAP[color];
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-3';

  /* ---------- HUD segmented bar ---------- */
  const segmentElements = useMemo(() => {
    if (!isHud) return null;
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
  }, [segments, activeCount, colors, heightClass, animate, isHud]);

  const labelClass = isHud
    ? `font-mono text-xs ${colors.text} tabular-nums min-w-[3ch] text-right`
    : `text-xs font-medium ${SIMPLE_TEXT_MAP[color]} tabular-nums min-w-[3ch] text-right`;

  /* ---------- Non-HUD: single continuous bar ---------- */
  if (!isHud) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex-1 rounded-full ${heightClass} bg-slate-200 dark:bg-slate-700/40 overflow-hidden`}>
          <div
            className={`${heightClass} rounded-full transition-all duration-500 ease-out ${SIMPLE_BG_MAP[color]}`}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
        {showLabel && (
          <span className={labelClass}>
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
    );
  }

  /* ---------- HUD: segmented with glow ---------- */
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px] flex-1">
        {segmentElements}
      </div>
      {showLabel && (
        <span className={labelClass}>
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
};
