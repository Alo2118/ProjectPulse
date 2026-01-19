import React from 'react';
import theme, { cn } from '../../styles/theme';

/**
 * Card Component - Design System v2.0
 *
 * ✅ Migrato al nuovo design system unificato
 * ✅ Usa theme.js invece di designTokens.js
 * ✅ Supporto completo dark mode
 *
 * @param {Object} props
 * @param {'base'|'hover'|'flat'|'elevated'} props.variant - Card style variant
 * @param {'sm'|'md'|'lg'} props.padding - Padding size
 * @param {boolean} props.hover - Enable hover effect (deprecated, use variant="hover")
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 */
export default function Card({
  variant = 'base',
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}) {
  // Get variant styles from theme
  const variantClasses = {
    base: theme.card.base,
    hover: theme.card.hover,
    flat: theme.card.flat,
    elevated: theme.card.elevated,
  };

  // Get padding from theme
  const paddingClasses = {
    sm: theme.card.padding.sm,
    md: theme.card.padding.md,
    lg: theme.card.padding.lg,
  };

  // Backward compatibility: if hover prop is true, use hover variant
  const effectiveVariant = hover ? 'hover' : variant;

  const cardClasses = cn(
    variantClasses[effectiveVariant] || variantClasses.base,
    paddingClasses[padding] || paddingClasses.md,
    className
  );

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
}

/**
 * CardHeader Component
 * For consistent card headers with title and optional actions
 *
 * @example
 * <CardHeader
 *   title="Task Details"
 *   subtitle="Updated 2 hours ago"
 *   action={<Button size="sm">Edit</Button>}
 * />
 */
export function CardHeader({ title, subtitle, action, compact = false, className = '' }) {
  return (
    <div
      className={cn(
        theme.layout.flex.between,
        'items-start',
        compact ? theme.spacing.mb.sm : theme.spacing.mb.md,
        className
      )}
    >
      <div>
        {title && (
          <h3 className={cn(compact ? 'text-base' : 'text-lg', 'font-semibold', theme.colors.text.accent)}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className={cn(compact ? 'text-xs' : 'text-sm', 'mt-1', theme.colors.text.muted, 'opacity-60')}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

/**
 * CardBody Component
 * For card content area
 *
 * @example
 * <CardBody>
 *   <p>Card content goes here</p>
 * </CardBody>
 */
export function CardBody({ className = '', children }) {
  return <div className={className}>{children}</div>;
}

/**
 * CardFooter Component
 * For card footer with actions or additional info
 *
 * @example
 * <CardFooter>
 *   <ButtonGroup>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Save</Button>
 *   </ButtonGroup>
 * </CardFooter>
 */
export function CardFooter({ className = '', children }) {
  return (
    <div
      className={cn(
        'mt-4 pt-4',
        'border-t-2',
        theme.colors.border.lightAlpha,
        className
      )}
    >
      {children}
    </div>
  );
}
