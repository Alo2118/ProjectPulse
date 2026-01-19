/**
 * ToastContext - Design System v2.0
 *
 * ✅ Migrato a theme system
 * ✅ Sostituisce tutti i window.alert()
 * ✅ Supporto per success, error, warning, info
 * ✅ Auto-dismiss configurabile
 * ✅ Animazioni smooth
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Check, AlertTriangle, Info, X } from 'lucide-react';
import theme, { cn } from '../styles/theme';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, ...options };

    setToasts((prev) => [...prev, toast]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = {
    success: (msg, options) => addToast(msg, 'success', 4000, options),
    error: (msg, options) => addToast(msg, 'error', 5000, options),
    warning: (msg, options) => addToast(msg, 'warning', 4000, options),
    info: (msg, options) => addToast(msg, 'info', 4000, options),
    showToast: addToast, // Generic method
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 space-y-3 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ id, message, type, title, action, onClose }) {
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          containerClass: cn(
            theme.colors.status.success.bg,
            theme.colors.status.success.border,
            'border-l-4'
          ),
          icon: Check,
          iconClass: theme.colors.status.success.textDark,
          textClass: theme.colors.status.success.text,
        };
      case 'error':
        return {
          containerClass: cn(
            theme.colors.status.error.bg,
            theme.colors.status.error.border,
            'border-l-4'
          ),
          icon: AlertCircle,
          iconClass: theme.colors.status.error.textDark,
          textClass: theme.colors.status.error.text,
        };
      case 'warning':
        return {
          containerClass: cn(
            theme.colors.status.warning.bg,
            theme.colors.status.warning.border,
            'border-l-4'
          ),
          icon: AlertTriangle,
          iconClass: theme.colors.status.warning.textDark,
          textClass: theme.colors.status.warning.text,
        };
      default:
        return {
          containerClass: cn(
            theme.colors.status.info.bg,
            theme.colors.status.info.border,
            'border-l-4'
          ),
          icon: Info,
          iconClass: theme.colors.status.info.textDark,
          textClass: theme.colors.status.info.text,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-lg border shadow-lg backdrop-blur-sm',
        theme.spacing.px.md,
        theme.spacing.py.sm,
        config.containerClass,
        'animate-slide-up',
        'hover:shadow-xl transition-all duration-200'
      )}
      role="alert"
    >
      <div className={theme.layout.flex.between}>
        <div className={cn(theme.layout.flex.start, 'flex-1 min-w-0')}>
          {/* Icon */}
          <Icon className={cn('h-5 w-5 flex-shrink-0 mr-3', config.iconClass)} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className={cn('font-semibold text-sm', config.textClass)}>
                {title}
              </h4>
            )}
            <p className={cn(theme.typography.bodySmall, config.textClass)}>
              {message}
            </p>
            {action && (
              <button
                onClick={action.onClick}
                className={cn(
                  'mt-1 text-xs font-medium underline',
                  config.textClass,
                  'hover:no-underline'
                )}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'flex-shrink-0 ml-3 p-1 rounded',
            'hover:bg-black/10 transition-colors',
            config.iconClass
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default ToastContext;
