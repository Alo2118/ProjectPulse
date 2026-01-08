import React from 'react';

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
    default: 'bg-white border border-gray-200',
    gradient: 'bg-gradient-to-br from-primary-500 to-primary-600 text-white',
    flat: 'bg-gray-50 border border-gray-200'
  };

  // Padding styles
  const paddingStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  // Shadow styles
  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
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
  `.trim().replace(/\s+/g, ' ');

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
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex justify-between items-start mb-4 ${className}`}>
      <div>
        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
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
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * CardFooter Component
 * For card footer with actions or additional info
 */
export function CardFooter({ className = '', children }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}
