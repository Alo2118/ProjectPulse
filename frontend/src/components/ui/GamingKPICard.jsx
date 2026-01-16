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
  className = ''
}) {
  return (
    <div 
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-4 rounded-xl border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
      {Icon && <Icon className="w-8 h-8 text-white/90 mb-2 relative z-10" />}
      <div className="relative z-10">
        <p className="text-white/80 text-xs font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white/70 text-sm font-medium">{subtitle}</span>
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
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
    6: 'md:grid-cols-3 lg:grid-cols-6'
  }[columns] || 'md:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 ${colsClass} gap-3 ${className}`}>
      {children}
    </div>
  );
}
