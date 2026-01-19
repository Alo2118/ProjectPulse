import React from 'react';
import { designTokens } from '../../config/designTokens';

/**
 * Card Component - Design System
 *
 * Unified card component for consistent styling across the app
 *
 * @param {Object} props
 * @param {'default'|'gradient'|'flat'} props.variant - Card style variant
 * @param {'sm'|'md'|'lg'} props.padding - Padding size
 * @param {'sm'|'md'|'lg'|'none'} props.shadow - Shadow depth
 * @param {boolean} props.hover - Enable hover effect
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  hover = false,
  className = '',
  children,
  ...props
}) {
  // Base styles
  const baseStyles = 'rounded-lg transition-all duration-200';

  // Variant styles
  const variantStyles = {
    default: 'bg-slate-100 dark:bg-slate-800/50 border-2 border-cyan-400 dark:border-cyan-500/30 shadow-lg shadow-cyan-500/10',
    gradient: 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white',
    flat: 'bg-slate-50 dark:bg-slate-800/30 border-2 border-cyan-300 dark:border-cyan-500/20',
  };

  // Padding styles
  const paddingStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  // Shadow styles
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  // Hover effect
  const hoverStyles = hover ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : '';

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${shadowStyles[shadow]}
    ${hoverStyles}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}

/**
 * CardHeader Component
 * For consistent card headers with title and optional actions
 */
export function CardHeader({ title, subtitle, action, compact = false, className = '' }) {
  return (
    <div className={`flex items-start justify-between ${compact ? 'mb-3' : 'mb-4'} ${className}`}>
      <div>
        {title && (
          <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold ${designTokens.colors.cyan.text}`}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className={`${compact ? 'text-xs' : 'text-sm'} mt-1 ${designTokens.colors.cyan.textLight} opacity-60`}>{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

/**
 * CardBody Component
 * For card content area
 */
export function CardBody({ className = '', children }) {
  return <div className={className}>{children}</div>;
}

/**
 * CardFooter Component
 * For card footer with actions or additional info
 */
export function CardFooter({ className = '', children }) {
  return <div className={`mt-4 border-t-2 border-cyan-500/20 pt-4 ${className}`}>{children}</div>;
}
