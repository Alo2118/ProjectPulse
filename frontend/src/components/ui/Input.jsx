import { designTokens } from '../../config/designTokens';

/**
 * Input Component - Centralizzato con gestione errori e varianti
 */
export const Input = ({ 
  error, 
  label, 
  className = '', 
  variant = 'default',
  ...props 
}) => {
  const { colors, components } = designTokens;
  
  const variants = {
    default: {
      border: error ? colors.error.border : colors.border,
      focus: 'focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/50',
    },
    search: {
      border: colors.borderLight,
      focus: 'focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30',
    },
  };

  const currentVariant = variants[variant] || variants.default;

  return (
    <div className="w-full">
      {label && (
        <label className={`mb-1 block text-sm font-medium ${colors.text.secondary}`}>
          {label}
        </label>
      )}
      <input
        className={`w-full border ${colors.bg.tertiary} ${currentVariant.border} ${components.inputBase} ${colors.text.primary} ${currentVariant.focus} ${className}`}
        {...props}
      />
      {error && (
        <p className={`mt-1 text-xs ${colors.error.text}`}>{error}</p>
      )}
    </div>
  );
};
