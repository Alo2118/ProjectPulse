import React from 'react';

/**
 * Button Component - Design System
 *
 * Uses centralized utility classes from tailwind.config.js
 * Variants: primary (default), secondary, danger, success, ghost
 * Sizes: sm, md (default), lg
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'success'|'ghost'} props.variant - Button style (default: primary)
 * @param {'sm'|'md'|'lg'} props.size - Button size (default: md)
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
  // Variant utility classes (all defined in tailwind.config.js)
  const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
  };

  // Size utility classes
  const sizeMap = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  const width = fullWidth ? 'w-full' : '';
  const variantClass = variantMap[variant] || variantMap.primary;
  const sizeClass = sizeMap[size] || sizeMap.md;

  const combined = `${variantClass} ${sizeClass} ${width} ${className}`.trim();

  return (
    <button className={combined} disabled={disabled || loading} {...props}>
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
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
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Button variant={variant} className={`${sizeStyles[size]} ${className}`} {...props}>
      {Icon && <Icon className={iconSizes[size]} />}
    </Button>
  );
}

/**
 * ButtonGroup Component
 * For grouping buttons together
 */
export function ButtonGroup({ className = '', children }) {
  return <div className={`inline-flex gap-2 ${className}`}>{children}</div>;
}
