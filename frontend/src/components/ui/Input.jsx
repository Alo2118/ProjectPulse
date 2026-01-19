import React from 'react';
import theme, { cn } from '../../styles/theme';

/**
 * Input Component - Design System v2.0
 *
 * ✅ Migrato al nuovo design system unificato
 * ✅ Usa theme.input invece di designTokens
 * ✅ Supporto per error/success states
 *
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.error - Error message
 * @param {string} props.success - Success message
 * @param {'sm'|'md'|'lg'} props.size - Input size
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.fullWidth - Full width input (default: true)
 */
export const Input = ({
  error,
  success,
  label,
  className = '',
  size = 'md',
  fullWidth = true,
  ...props
}) => {
  // Determine state class
  const getStateClass = () => {
    if (error) return theme.input.error;
    if (success) return theme.input.success;
    return '';
  };

  const inputClasses = cn(
    theme.input.base,
    theme.input.size[size],
    getStateClass(),
    fullWidth && 'w-full',
    className
  );

  return (
    <div className={cn(fullWidth && 'w-full')}>
      {label && (
        <label className={cn('mb-2 block', theme.typography.label)}>
          {label}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && (
        <p className={cn('mt-1', theme.typography.caption, theme.colors.status.error.text)}>
          {error}
        </p>
      )}
      {success && !error && (
        <p className={cn('mt-1', theme.typography.caption, theme.colors.status.success.text)}>
          {success}
        </p>
      )}
    </div>
  );
};

/**
 * Textarea Component
 *
 * @example
 * <Textarea label="Description" rows={4} />
 */
export const Textarea = ({
  error,
  success,
  label,
  className = '',
  size = 'md',
  fullWidth = true,
  rows = 4,
  ...props
}) => {
  // Determine state class
  const getStateClass = () => {
    if (error) return theme.input.error;
    if (success) return theme.input.success;
    return '';
  };

  const textareaClasses = cn(
    theme.input.base,
    theme.input.size[size],
    getStateClass(),
    fullWidth && 'w-full',
    'resize-none',
    className
  );

  return (
    <div className={cn(fullWidth && 'w-full')}>
      {label && (
        <label className={cn('mb-2 block', theme.typography.label)}>
          {label}
        </label>
      )}
      <textarea className={textareaClasses} rows={rows} {...props} />
      {error && (
        <p className={cn('mt-1', theme.typography.caption, theme.colors.status.error.text)}>
          {error}
        </p>
      )}
      {success && !error && (
        <p className={cn('mt-1', theme.typography.caption, theme.colors.status.success.text)}>
          {success}
        </p>
      )}
    </div>
  );
};

/**
 * Select Component
 *
 * @example
 * <Select label="Priority" options={['low', 'medium', 'high']} />
 */
export const Select = ({
  error,
  success,
  label,
  options = [],
  className = '',
  size = 'md',
  fullWidth = true,
  placeholder = 'Select an option',
  ...props
}) => {
  // Determine state class
  const getStateClass = () => {
    if (error) return theme.input.error;
    if (success) return theme.input.success;
    return '';
  };

  const selectClasses = cn(
    theme.input.base,
    theme.input.size[size],
    getStateClass(),
    fullWidth && 'w-full',
    'cursor-pointer',
    className
  );

  return (
    <div className={cn(fullWidth && 'w-full')}>
      {label && (
        <label className={cn('mb-2 block', theme.typography.label)}>
          {label}
        </label>
      )}
      <select className={selectClasses} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <p className={cn('mt-1', theme.typography.caption, theme.colors.status.error.text)}>
          {error}
        </p>
      )}
      {success && !error && (
        <p className={cn('mt-1', theme.typography.caption, theme.colors.status.success.text)}>
          {success}
        </p>
      )}
    </div>
  );
};

/**
 * Checkbox Component
 *
 * @example
 * <Checkbox label="I agree to terms" />
 */
export const Checkbox = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', className)}>
      <input
        type="checkbox"
        className={cn(
          'w-4 h-4 rounded border-2',
          theme.colors.border.accent,
          'checked:bg-cyan-600 checked:border-cyan-600',
          'focus:ring-2 focus:ring-cyan-500/50',
          'transition-all cursor-pointer'
        )}
        {...props}
      />
      {label && (
        <span className={theme.typography.body}>{label}</span>
      )}
    </label>
  );
};

export default Input;
