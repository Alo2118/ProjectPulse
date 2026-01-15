import { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Check, AlertTriangle, Info, X } from 'lucide-react';

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

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const toast = { id, message, type };

    setToasts(prev => [...prev, toast]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 space-y-3 z-50 pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ id, message, type, onClose }) {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success-50',
          border: 'border-success-200',
          text: 'text-success-800',
          icon: Check,
          iconColor: 'text-success-600',
        };
      case 'error':
        return {
          bg: 'bg-danger-50',
          border: 'border-danger-200',
          text: 'text-danger-800',
          icon: AlertCircle,
          iconColor: 'text-danger-600',
        };
      case 'warning':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          text: 'text-warning-800',
          icon: AlertTriangle,
          iconColor: 'text-warning-600',
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-800',
          icon: Info,
          iconColor: 'text-slate-600',
        };
    }
  };

  const styles = getStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} ${styles.text}
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        animate-slide-up pointer-events-auto max-w-sm
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${styles.iconColor}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
