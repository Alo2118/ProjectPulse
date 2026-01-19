import React from 'react';
import { designTokens } from '../../config/designTokens';

/**
 * Gaming-style page layout with gradient background
 */
export function GamingLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}

/**
 * Gaming-style page header
 */
export function GamingHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className={`mb-1 flex items-center gap-2 text-3xl font-bold ${designTokens.colors.cyan.text}`}>
          {Icon && <Icon className={`h-8 w-8 ${designTokens.colors.cyan.textLight}`} />}
          {title}
        </h1>
        {subtitle && <p className={`text-base font-medium ${designTokens.colors.cyan.textLight} opacity-60`}>{subtitle}</p>}
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
    <div className={`card-lg ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Gaming-style loading screen
 */
export function GamingLoader({ message = 'Caricamento...' }) {
  return (
    <div className="page-container flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner h-16 w-16"></div>
        <p className="loading-text mt-4">{message}</p>
      </div>
    </div>
  );
}
