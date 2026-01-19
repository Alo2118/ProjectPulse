import { designTokens } from '../../config/designTokens';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Alert Component - Messaggi semantici
 */
export const Alert = ({ 
  children, 
  variant = 'info',
  icon: CustomIcon,
  className = '' 
}) => {
  const { colors } = designTokens;
  
  const variants = {
    success: {
      bg: colors.success.bg,
      text: colors.success.text,
      border: colors.success.border,
      Icon: CheckCircle,
    },
    error: {
      bg: colors.error.bg,
      text: colors.error.text,
      border: colors.error.border,
      Icon: AlertCircle,
    },
    warning: {
      bg: colors.warning.bg,
      text: colors.warning.text,
      border: colors.warning.border,
      Icon: AlertTriangle,
    },
    info: {
      bg: colors.info.bg,
      text: colors.info.text,
      border: colors.info.border,
      Icon: Info,
    },
  };

  const currentVariant = variants[variant] || variants.info;
  const Icon = CustomIcon || currentVariant.Icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${currentVariant.bg} ${currentVariant.border} ${className}`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${currentVariant.text}`} />
      <div className={`flex-1 text-sm ${currentVariant.text}`}>
        {children}
      </div>
    </div>
  );
};
