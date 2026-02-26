/**
 * KPICard - Reusable KPI display card with HUD aesthetics
 * Part of the JARVIS dashboard redesign (Phase 3, Task 8)
 *
 * Renders a large monospaced metric with glow text, HUD corner brackets,
 * optional trend indicator, and a card-power-on entrance animation.
 */

import React from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KPICardProps {
  /** The numeric value to display */
  value: number
  /** Short descriptive label, rendered in uppercase tracking-widest */
  label: string
  /** Optional trend data — direction + signed delta */
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  /** Color theme for the value */
  color?: 'cyan' | 'amber' | 'red' | 'indigo'
  /** Click handler — enables cursor-pointer when provided */
  onClick?: () => void
  /** Stagger delay in ms for the card-power-on animation */
  delay?: number
}

// ─── Color maps ───────────────────────────────────────────────────────────────

interface ColorTokens {
  valueClass: string
  shadowStyle?: React.CSSProperties
}

const COLOR_TOKENS: Record<string, ColorTokens> = {
  cyan: {
    valueClass: 'text-cyan-400',
  },
  amber: {
    valueClass: 'text-amber-400',
  },
  red: {
    valueClass: 'text-red-400',
    shadowStyle: {
      textShadow:
        '0 0 7px rgba(239,68,68,0.5), 0 0 20px rgba(239,68,68,0.3), 0 0 40px rgba(239,68,68,0.15)',
    },
  },
  indigo: {
    valueClass: 'text-blue-400',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KPICard({
  value,
  label,
  trend,
  color = 'cyan',
  onClick,
  delay = 0,
}: KPICardProps) {
  const tokens = COLOR_TOKENS[color] ?? COLOR_TOKENS.cyan
  const isClickable = typeof onClick === 'function'

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={[
        'card hud-corners p-5 select-none',
        'animate-card-power-on',
        isClickable
          ? 'cursor-pointer transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-800/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
      aria-label={`${label}: ${value}${trend ? `, ${trend.direction === 'up' ? 'incremento' : 'decremento'} ${trend.value}` : ''}`}
    >
      {/* Value — monospaced with glow */}
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono text-3xl font-bold glow-text tabular-nums leading-none ${tokens.valueClass}`}
          style={tokens.shadowStyle}
        >
          {value}
        </span>

        {/* Trend indicator — small arrow + delta */}
        {trend && (
          <span
            className={`ml-1 text-xs font-semibold tabular-nums ${
              trend.direction === 'up'
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
            aria-label={
              trend.direction === 'up'
                ? `Incremento di ${trend.value}`
                : `Decremento di ${trend.value}`
            }
          >
            {trend.direction === 'up' ? '\u25b2' : '\u25bc'}
            {' '}{trend.value}
          </span>
        )}
      </div>

      {/* Label */}
      <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 leading-tight">
        {label}
      </p>
    </div>
  )
}
