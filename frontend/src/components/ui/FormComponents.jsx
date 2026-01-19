/**
 * FormComponents - Design System v2.0
 *
 * ✅ Centralizzato con design system unificato
 * ✅ Re-esporta componenti migrati per backward compatibility
 * ✅ Mantiene solo componenti unici (KPICard, Alert, etc.)
 *
 * NOTA: Questo file re-esporta i componenti base migrati
 * (Button, Card, Badge, Input) per mantenere la backward compatibility.
 */

import theme, { cn } from '../../styles/theme';

// Re-export migrated components for backward compatibility
export { default as Button, IconButton, ButtonGroup } from './Button';
export { default as Card, CardHeader, CardBody, CardFooter } from './Card';
export { default as Badge, StatusBadge, PriorityBadge, RoleBadge, CategoryBadge } from './Badge';
export { default as Input, Textarea, Select, Checkbox } from './Input';

/**
 * KPICard - For dashboard metrics
 *
 * @example
 * <KPICard
 *   title="Total Tasks"
 *   value="142"
 *   change={12.5}
 *   icon={TaskIcon}
 *   color="primary"
 * />
 */
export function KPICard({ title, value, change, icon: Icon, color = 'primary' }) {
  const colorVariants = {
    primary: {
      container: cn(theme.colors.status.info.bg, theme.colors.status.info.border, 'border'),
      text: theme.colors.status.info.text,
    },
    success: {
      container: cn(theme.colors.status.success.bg, theme.colors.status.success.border, 'border'),
      text: theme.colors.status.success.text,
    },
    warning: {
      container: cn(theme.colors.status.warning.bg, theme.colors.status.warning.border, 'border'),
      text: theme.colors.status.warning.text,
    },
    danger: {
      container: cn(theme.colors.status.error.bg, theme.colors.status.error.border, 'border'),
      text: theme.colors.status.error.text,
    },
  };

  const selectedColor = colorVariants[color] || colorVariants.primary;
  const isPositive = change >= 0;
  const arrow = isPositive ? '↑' : '↓';
  const changeColorClass = isPositive
    ? theme.colors.status.success.textDark
    : theme.colors.status.error.textDark;

  return (
    <div className={cn(theme.card.base, theme.spacing.p.md, selectedColor.container)}>
      <div className="space-y-3">
        <div className={theme.layout.flex.between}>
          <div>
            <p className={cn(theme.typography.bodySmall, 'opacity-75')}>{title}</p>
            <p className={cn('mt-1 text-2xl font-bold', selectedColor.text)}>{value}</p>
          </div>
          {Icon && <Icon className="h-8 w-8 opacity-30" />}
        </div>
        {change !== undefined && (
          <p className={cn('text-xs font-semibold', changeColorClass)}>
            {arrow} {Math.abs(change)}% vs mese scorso
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Alert Component - For notifications and messages
 *
 * @example
 * <Alert type="success" title="Success!" message="Operation completed" />
 */
export function Alert({ type = 'info', title, message, onClose, className = '' }) {
  const alertVariants = {
    success: {
      container: theme.colors.status.success.bg,
      border: theme.colors.status.success.border,
      text: theme.colors.status.success.text,
      icon: '✓',
    },
    error: {
      container: theme.colors.status.error.bg,
      border: theme.colors.status.error.border,
      text: theme.colors.status.error.text,
      icon: '✕',
    },
    warning: {
      container: theme.colors.status.warning.bg,
      border: theme.colors.status.warning.border,
      text: theme.colors.status.warning.text,
      icon: '⚠',
    },
    info: {
      container: theme.colors.status.info.bg,
      border: theme.colors.status.info.border,
      text: theme.colors.status.info.text,
      icon: 'ℹ',
    },
  };

  const variant = alertVariants[type] || alertVariants.info;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variant.container,
        variant.border,
        theme.animation.fadeIn,
        className
      )}
    >
      <div className={theme.layout.flex.between}>
        <div className={theme.layout.flex.start}>
          <span className={cn('mr-3 text-xl', variant.text)}>{variant.icon}</span>
          <div>
            {title && (
              <h4 className={cn('font-semibold', variant.text)}>{title}</h4>
            )}
            {message && (
              <p className={cn(theme.typography.bodySmall, 'mt-1', variant.text)}>
                {message}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'ml-4 text-lg leading-none opacity-60 hover:opacity-100',
              variant.text
            )}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Divider Component
 *
 * @example
 * <Divider />
 * <Divider text="OR" />
 */
export function Divider({ text, className = '' }) {
  if (text) {
    return (
      <div className={cn(theme.layout.flex.center, 'my-4', className)}>
        <div className={cn('flex-1 border-t-2', theme.colors.border.lightAlpha)} />
        <span className={cn('px-4', theme.typography.caption, theme.colors.text.muted)}>
          {text}
        </span>
        <div className={cn('flex-1 border-t-2', theme.colors.border.lightAlpha)} />
      </div>
    );
  }

  return <hr className={cn('my-4 border-t-2', theme.colors.border.lightAlpha, className)} />;
}

/**
 * LoadingSpinner Component
 *
 * @example
 * <LoadingSpinner size="md" />
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full',
        'border-cyan-500 border-t-transparent',
        sizes[size],
        className
      )}
    />
  );
}

/**
 * EmptyState Component
 *
 * @example
 * <EmptyState
 *   icon={InboxIcon}
 *   title="No tasks found"
 *   description="Create your first task to get started"
 *   action={<Button onClick={onCreate}>Create Task</Button>}
 * />
 */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={cn('text-center py-12', className)}>
      {Icon && (
        <div className={cn(theme.layout.flex.center, 'mb-4')}>
          <Icon className={cn('w-16 h-16', theme.colors.text.muted, 'opacity-30')} />
        </div>
      )}
      {title && (
        <h3 className={cn(theme.typography.h4, theme.colors.text.secondary, 'mb-2')}>
          {title}
        </h3>
      )}
      {description && (
        <p className={cn(theme.typography.body, theme.colors.text.muted, 'mb-6')}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
