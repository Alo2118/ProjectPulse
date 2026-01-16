import React from 'react';

/**
 * Gaming-style page layout with gradient background
 */
export function GamingLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

/**
 * Gaming-style page header
 */
export function GamingHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-cyan-300 mb-1 flex items-center gap-2">
          {Icon && <Icon className="w-8 h-8 text-cyan-400" />}
          {title}
        </h1>
        {subtitle && <p className="text-base text-cyan-400/60 font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * Gaming-style card
 */
export function GamingCard({ children, className = '', ...props }) {
  return (
    <div className={`bg-slate-800/50 border-2 border-cyan-500/30 rounded-lg p-6 shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/20 transition-all ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Gaming-style loading screen
 */
export function GamingLoader({ message = 'Caricamento...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500 shadow-xl shadow-cyan-500/50"></div>
        <p className="mt-4 text-cyan-300 font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
}
