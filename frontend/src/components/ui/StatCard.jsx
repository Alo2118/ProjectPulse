import React from 'react';
import Card from './Card';

/**
 * StatCard Component - Design System
 *
 * Specialized card component for displaying statistics and metrics
 *
 * @param {Object} props
 * @param {string} props.title - Stat title/label
 * @param {string|number} props.value - Stat value
 * @param {string} props.subtitle - Optional subtitle/description
 * @param {React.Component} props.icon - Optional icon component
 * @param {'default'|'gradient'|'flat'} props.variant - Card style variant
 * @param {string} props.trend - Optional trend indicator ('+10%', '-5%')
 * @param {'up'|'down'|'neutral'} props.trendDirection - Trend direction
 * @param {string} props.iconBg - Background color for icon (Tailwind class)
 * @param {string} props.iconColor - Icon color (Tailwind class)
 * @param {string} props.className - Additional CSS classes
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  trendDirection = 'neutral',
  iconBg = 'bg-primary-100',
  iconColor = 'text-primary-600',
  className = '',
  onClick
}) {
  // Trend colors
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <Card
      variant={variant}
      padding="lg"
      shadow="md"
      hover={!!onClick}
      className={className}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${variant === 'gradient' ? 'text-white/80' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`mt-2 text-3xl font-bold ${variant === 'gradient' ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`mt-1 text-sm ${variant === 'gradient' ? 'text-white/70' : 'text-gray-500'}`}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={`mt-2 text-sm font-medium ${variant === 'gradient' ? 'text-white/90' : trendColors[trendDirection]}`}>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${variant === 'gradient' ? 'bg-white/20' : iconBg}`}>
            <Icon className={`w-6 h-6 ${variant === 'gradient' ? 'text-white' : iconColor}`} />
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * StatCardGrid Component
 * For consistent grid layout of stat cards
 */
export function StatCardGrid({ children, columns = 4, className = '' }) {
  const columnStyles = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${columnStyles[columns]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * SimpleStatCard Component
 * Simplified version without icon
 */
export function SimpleStatCard({ title, value, subtitle, variant = 'default', className = '' }) {
  return (
    <Card variant={variant} padding="md" shadow="sm" className={className}>
      <p className={`text-xs font-medium uppercase tracking-wide ${variant === 'gradient' ? 'text-white/80' : 'text-gray-500'}`}>
        {title}
      </p>
      <p className={`mt-2 text-2xl font-bold ${variant === 'gradient' ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      {subtitle && (
        <p className={`mt-1 text-sm ${variant === 'gradient' ? 'text-white/70' : 'text-gray-600'}`}>
          {subtitle}
        </p>
      )}
    </Card>
  );
}
