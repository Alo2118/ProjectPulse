import React from 'react';

/**
 * Button Component - Design System
 *
 * Unified button component for consistent styling across the app
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'success'|'ghost'} props.variant - Button style variant
 * @param {'sm'|'md'|'lg'} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.fullWidth - Full width button
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  ...props
}) {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant styles
  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500'
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

/**
 * IconButton Component
 * For icon-only buttons
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  icon: Icon,
  className = '',
  ...props
}) {
  const sizeStyles = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <Button
      variant={variant}
      className={`${sizeStyles[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={iconSizes[size]} />}
    </Button>
  );
}

/**
 * ButtonGroup Component
 * For grouping buttons together
 */
export function ButtonGroup({ className = '', children }) {
  return (
    <div className={`inline-flex gap-2 ${className}`}>
      {children}
    </div>
  );
}
