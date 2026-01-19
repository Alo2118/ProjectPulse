import React from 'react';

/**
 * Gaming-style KPI Card with gradient background and hover effects
 */
export default function GamingKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient = 'from-purple-600 to-pink-700',
  shadowColor = 'purple',
  onClick,
  className = '',
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} group cursor-pointer rounded-xl border-0 p-4 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${className}`}
      onClick={onClick}
    >
      <div className="absolute right-0 top-0 -mr-12 -mt-12 h-24 w-24 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150"></div>
      {Icon && <Icon className="relative z-10 mb-2 h-8 w-8 text-white/90" />}
      <div className="relative z-10">
        <p className="mb-1 text-xs font-medium text-white/80">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-medium text-white/70">{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid container for KPI cards
 */
export function GamingKPIGrid({ children, columns = 4, className = '' }) {
  const colsClass =
    {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-2 lg:grid-cols-4',
      5: 'md:grid-cols-3 lg:grid-cols-5',
      6: 'md:grid-cols-3 lg:grid-cols-6',
    }[columns] || 'md:grid-cols-4';

  return <div className={`grid grid-cols-1 ${colsClass} gap-3 ${className}`}>{children}</div>;
}
