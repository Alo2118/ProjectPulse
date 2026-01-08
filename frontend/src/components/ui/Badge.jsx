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
export default function Badge({
  type = 'category',
  value,
  size = 'md',
  className = '',
  children
}) {
  // Base styles
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  // Status color mappings
  const statusColors = {
    'da_fare': 'bg-gray-100 text-gray-700 border border-gray-300',
    'in_corso': 'bg-blue-100 text-blue-700 border border-blue-300',
    'in_revisione': 'bg-purple-100 text-purple-700 border border-purple-300',
    'completato': 'bg-green-100 text-green-700 border border-green-300',
    'in_pausa': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    'bloccato': 'bg-red-100 text-red-700 border border-red-300',
    'annullato': 'bg-gray-100 text-gray-500 border border-gray-300',
    // Request status
    'new': 'bg-blue-100 text-blue-700 border border-blue-300',
    'reviewing': 'bg-purple-100 text-purple-700 border border-purple-300',
    'approved': 'bg-green-100 text-green-700 border border-green-300',
    'rejected': 'bg-red-100 text-red-700 border border-red-300',
    'converted_to_task': 'bg-teal-100 text-teal-700 border border-teal-300',
    'converted_to_project': 'bg-indigo-100 text-indigo-700 border border-indigo-300',
    // Project status
    'pianificazione': 'bg-blue-100 text-blue-700 border border-blue-300',
    'attivo': 'bg-green-100 text-green-700 border border-green-300',
    'sospeso': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    'archiviato': 'bg-gray-100 text-gray-500 border border-gray-300'
  };

  // Priority color mappings
  const priorityColors = {
    'bassa': 'bg-gray-100 text-gray-700 border border-gray-300',
    'media': 'bg-blue-100 text-blue-700 border border-blue-300',
    'alta': 'bg-orange-100 text-orange-700 border border-orange-300',
    'urgente': 'bg-red-100 text-red-700 border border-red-300',
    // English variants
    'low': 'bg-gray-100 text-gray-700 border border-gray-300',
    'medium': 'bg-blue-100 text-blue-700 border border-blue-300',
    'high': 'bg-orange-100 text-orange-700 border border-orange-300',
    'urgent': 'bg-red-100 text-red-700 border border-red-300'
  };

  // Default category colors
  const categoryColors = 'bg-primary-100 text-primary-700 border border-primary-300';

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
  `.trim().replace(/\s+/g, ' ');

  return (
    <span className={combinedClassName}>
      {displayText}
    </span>
  );
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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
  return <Badge type="category" value={category} {...props}>{children}</Badge>;
}
