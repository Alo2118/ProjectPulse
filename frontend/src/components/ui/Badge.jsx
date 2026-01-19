import React from 'react';

/**
 * Badge Component - Design System
 *
 * Unified badge component for status, priority, and category indicators
 *
 * @param {Object} props
 * @param {'status'|'priority'|'category'} props.type - Badge type
 * @param {string} props.value - Badge value (status/priority/category name)
 * @param {'sm'|'md'|'lg'} props.size - Badge size
 * @param {string} props.className - Additional CSS classes
 */
export default function Badge({ type = 'category', value, size = 'md', className = '', children }) {
  // Base styles
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  // Status color mappings
  const statusColors = {
    da_fare: 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50',
    in_corso: 'bg-blue-500/20 text-blue-300 border-2 border-blue-500/30',
    in_revisione: 'bg-purple-500/20 text-purple-300 border-2 border-purple-500/30',
    completato: 'bg-green-500/20 text-green-300 border-2 border-green-500/30',
    in_pausa: 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/30',
    bloccato: 'bg-red-500/20 text-red-300 border-2 border-red-500/30',
    annullato: 'bg-slate-800/50 text-slate-500 border-2 border-slate-700/50',
    // Request status
    new: 'bg-blue-500/20 text-blue-300 border-2 border-blue-500/30',
    reviewing: 'bg-purple-500/20 text-purple-300 border-2 border-purple-500/30',
    approved: 'bg-green-500/20 text-green-300 border-2 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-2 border-red-500/30',
    converted_to_task: 'bg-teal-500/20 text-teal-300 border-2 border-teal-500/30',
    converted_to_project: 'bg-indigo-500/20 text-indigo-300 border-2 border-indigo-500/30',
    // Project status
    pianificazione: 'bg-blue-500/20 text-blue-300 border-2 border-blue-500/30',
    attivo: 'bg-green-500/20 text-green-300 border-2 border-green-500/30',
    sospeso: 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/30',
    archiviato: 'bg-slate-800/50 text-slate-500 border-2 border-slate-700/50',
  };

  // Priority color mappings
  const priorityColors = {
    bassa: 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50',
    media: 'bg-blue-500/20 text-blue-300 border-2 border-blue-500/30',
    alta: 'bg-orange-500/20 text-orange-300 border-2 border-orange-500/30',
    urgente: 'bg-red-500/20 text-red-300 border-2 border-red-500/30',
    // English variants
    low: 'bg-slate-800/50 text-slate-300 border-2 border-slate-700/50',
    medium: 'bg-blue-500/20 text-blue-300 border-2 border-blue-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-2 border-orange-500/30',
    urgent: 'bg-red-500/20 text-red-300 border-2 border-red-500/30',
  };

  // Default category colors
  const categoryColors = 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-500/30';

  // Get color based on type and value
  const getColorClass = () => {
    const normalizedValue = value?.toLowerCase();

    if (type === 'status') {
      return statusColors[normalizedValue] || statusColors['da_fare'];
    }

    if (type === 'priority') {
      return priorityColors[normalizedValue] || priorityColors['media'];
    }

    return categoryColors;
  };

  // Get display text
  const displayText = children || formatBadgeText(value);

  const combinedClassName = `
    ${baseStyles}
    ${sizeStyles[size]}
    ${getColorClass()}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  return <span className={combinedClassName}>{displayText}</span>;
}

/**
 * Format badge text for display
 */
function formatBadgeText(value) {
  if (!value) return '';

  // Replace underscores with spaces and capitalize
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * StatusBadge - Shortcut for status badges
 */
export function StatusBadge({ status, ...props }) {
  return <Badge type="status" value={status} {...props} />;
}

/**
 * PriorityBadge - Shortcut for priority badges
 */
export function PriorityBadge({ priority, ...props }) {
  return <Badge type="priority" value={priority} {...props} />;
}

/**
 * CategoryBadge - Shortcut for category badges
 */
export function CategoryBadge({ category, children, ...props }) {
  return (
    <Badge type="category" value={category} {...props}>
      {children}
    </Badge>
  );
}
