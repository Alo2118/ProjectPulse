import React from 'react';
import theme, { cn } from '../../styles/theme';

/**
 * Badge Component - Design System v2.0
 *
 * ✅ Migrato al nuovo design system unificato
 * ✅ Usa theme.badge invece di classi hardcoded
 * ✅ Supporto per status, priority, role, semantic
 *
 * @param {Object} props
 * @param {'status'|'priority'|'role'|'semantic'|'category'} props.type - Badge type
 * @param {string} props.value - Badge value (status/priority/role name)
 * @param {'sm'|'md'|'lg'} props.size - Badge size
 * @param {string} props.className - Additional CSS classes
 */
export default function Badge({ type = 'category', value, size = 'md', className = '', children }) {
  // Size styles (consistent with design system)
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  // Get badge style from theme based on type and value
  const getBadgeClass = () => {
    const normalizedValue = value?.toLowerCase().replace(/-/g, '_');

    switch (type) {
      case 'status':
        // Map common status values to theme
        const statusMap = {
          // Task status
          todo: 'todo',
          da_fare: 'todo',
          in_progress: 'in_progress',
          in_corso: 'in_progress',
          blocked: 'blocked',
          bloccato: 'blocked',
          waiting_clarification: 'waiting_clarification',
          attesa_chiarimenti: 'waiting_clarification',
          completed: 'completed',
          completato: 'completed',
          // Request status
          new: 'in_progress',
          reviewing: 'waiting_clarification',
          approved: 'completed',
          rejected: 'blocked',
          converted_to_task: 'completed',
          converted_to_project: 'completed',
          // Project status
          pianificazione: 'todo',
          attivo: 'in_progress',
          sospeso: 'blocked',
          archiviato: 'completed',
        };
        const mappedStatus = statusMap[normalizedValue] || 'todo';
        return theme.badge.status[mappedStatus];

      case 'priority':
        // Map priority values
        const priorityMap = {
          low: 'low',
          bassa: 'low',
          medium: 'medium',
          media: 'medium',
          high: 'high',
          alta: 'high',
          urgent: 'high', // Urgent -> high
          urgente: 'high',
        };
        const mappedPriority = priorityMap[normalizedValue] || 'medium';
        return theme.badge.priority[mappedPriority];

      case 'role':
        // Map user roles
        const roleMap = {
          amministratore: 'amministratore',
          admin: 'amministratore',
          direzione: 'direzione',
          management: 'direzione',
          dipendente: 'dipendente',
          employee: 'dipendente',
        };
        const mappedRole = roleMap[normalizedValue] || 'dipendente';
        return theme.badge.role[mappedRole];

      case 'semantic':
        // Semantic badges (success, error, warning, info)
        const semanticMap = {
          success: theme.badge.success,
          error: theme.badge.error,
          warning: theme.badge.warning,
          info: theme.badge.info,
        };
        return semanticMap[normalizedValue] || theme.badge.info;

      case 'category':
      default:
        // Default category badge
        return theme.badge.info;
    }
  };

  // Get display text
  const displayText = children || formatBadgeText(value);

  const badgeClasses = cn(
    theme.badge.base,
    sizeStyles[size],
    getBadgeClass(),
    className
  );

  return <span className={badgeClasses}>{displayText}</span>;
}

/**
 * Format badge text for display
 */
function formatBadgeText(value) {
  if (!value) return '';

  // Replace underscores and hyphens with spaces and capitalize
  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * StatusBadge - Shortcut for status badges
 *
 * @example
 * <StatusBadge status="in_progress" />
 * <StatusBadge status="completed" />
 */
export function StatusBadge({ status, ...props }) {
  return <Badge type="status" value={status} {...props} />;
}

/**
 * PriorityBadge - Shortcut for priority badges
 *
 * @example
 * <PriorityBadge priority="high" />
 * <PriorityBadge priority="low" />
 */
export function PriorityBadge({ priority, ...props }) {
  return <Badge type="priority" value={priority} {...props} />;
}

/**
 * RoleBadge - Shortcut for role badges
 *
 * @example
 * <RoleBadge role="amministratore" />
 * <RoleBadge role="dipendente" />
 */
export function RoleBadge({ role, ...props }) {
  return <Badge type="role" value={role} {...props} />;
}

/**
 * CategoryBadge - Shortcut for category badges
 *
 * @example
 * <CategoryBadge category="Frontend" />
 */
export function CategoryBadge({ category, children, ...props }) {
  return (
    <Badge type="category" value={category} {...props}>
      {children}
    </Badge>
  );
}
