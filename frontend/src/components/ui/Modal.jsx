import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal Component - Design System
 *
 * Unified modal dialog component with consistent styling
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {string} props.description - Optional description
 * @param {'sm'|'md'|'lg'|'xl'|'full'} props.size - Modal size
 * @param {boolean} props.closeOnOverlayClick - Close on overlay click (default: true)
 * @param {boolean} props.showCloseButton - Show X button (default: true)
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Optional footer content
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  compact = false,
  children,
  footer
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Size styles
  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col transform transition-all animate-slide-up border border-slate-200`}
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between ${compact ? 'p-4' : 'p-6'} border-b border-slate-200 bg-gradient-to-r from-primary-50 to-white`}>
          <div className="flex-1">
            <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-slate-900`}>{title}</h2>
            {description && (
              <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-600`}>{description}</p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="ml-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-all hover:scale-110"
            >
              <X className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${compact ? 'p-4' : 'p-6'} bg-slate-50`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`${compact ? 'p-4' : 'p-6'} border-t border-slate-200 bg-white flex justify-end gap-3`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ModalFooter Component
 * Pre-styled footer with common action buttons
 */
export function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Annulla',
  confirmText = 'Conferma',
  confirmVariant = 'primary',
  confirmLoading = false,
  confirmDisabled = false,
  children
}) {
  if (children) {
    return <>{children}</>;
  }

  return (
    <>
      <Button variant="secondary" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button
        variant={confirmVariant}
        onClick={onConfirm}
        loading={confirmLoading}
        disabled={confirmDisabled}
      >
        {confirmText}
      </Button>
    </>
  );
}

/**
 * ConfirmModal Component
 * Quick confirmation dialog
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Conferma azione',
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'danger'
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => {
            onConfirm();
            onClose();
          }}
          cancelText={cancelText}
          confirmText={confirmText}
          confirmVariant={variant}
        />
      }
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
}
