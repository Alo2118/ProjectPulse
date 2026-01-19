import React from 'react';
import theme, { cn } from '../../styles/theme';

/**
 * Button Component - Design System v2.0
 *
 * ✅ Migrato al nuovo design system unificato
 * ✅ Usa theme.js invece di tailwind.config.js plugin
 * ✅ Type-safe con autocomplete
 *
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
  // Get styles from centralized theme
  const variantClasses = {
    primary: theme.button.primary,
    secondary: theme.button.secondary,
    danger: theme.button.danger,
    success: theme.button.success,
    ghost: theme.button.ghost,
  };

  const sizeClasses = {
    sm: theme.button.size.sm,
    md: theme.button.size.md,
    lg: theme.button.size.lg,
  };

  const buttonClasses = cn(
    theme.button.base,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    fullWidth && 'w-full',
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
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
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

/**
 * IconButton Component
 * For icon-only buttons
 *
 * @example
 * <IconButton icon={TrashIcon} variant="danger" size="sm" onClick={handleDelete} />
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
    <Button
      variant={variant}
      className={cn(sizeStyles[size], className)}
      {...props}
    >
      {Icon && <Icon className={iconSizes[size]} />}
    </Button>
  );
}

/**
 * ButtonGroup Component
 * For grouping buttons together
 *
 * @example
 * <ButtonGroup>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="primary">Save</Button>
 * </ButtonGroup>
 */
export function ButtonGroup({ className = '', children }) {
  return (
    <div className={cn(theme.layout.flex.start, theme.spacing.gap.sm, className)}>
      {children}
    </div>
  );
}
