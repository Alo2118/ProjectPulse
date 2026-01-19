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
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 space-y-3">
      {toasts.map((toast) => (
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
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          text: 'text-green-300',
          icon: Check,
          iconColor: 'text-green-400',
        };
      case 'error':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          text: 'text-red-300',
          icon: AlertCircle,
          iconColor: 'text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/30',
          text: 'text-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      default:
        return {
          bg: 'bg-slate-700/50',
          border: 'border-cyan-500/30',
          text: 'text-slate-200',
          icon: Info,
          iconColor: 'text-cyan-400',
        };
    }
  };

  const styles = getStyles();
  const Icon = styles.icon;

  return (
    <div
      className={` ${styles.bg} ${styles.border} ${styles.text} pointer-events-auto flex max-w-sm animate-slide-up items-center gap-3 rounded-lg border px-4 py-3 shadow-lg`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${styles.iconColor}`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-500 transition-colors hover:text-slate-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
