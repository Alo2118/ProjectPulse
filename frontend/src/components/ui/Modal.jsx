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
  footer,
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
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={`card-lg w-full ${sizeStyles[size]} flex max-h-[90vh] animate-slide-up flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between ${compact ? 'p-4' : 'p-6'} border-b-2 ${designTokens.colors.cyan.borderLight} bg-slate-100/50 dark:bg-slate-800/50`}
        >
          <div className="flex-1">
            <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold ${designTokens.colors.cyan.text}`}>
              {title}
            </h2>
            {description && (
              <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-400`}>
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={`ml-4 rounded-lg p-1.5 ${designTokens.colors.cyan.textLight} opacity-60 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 hover:${designTokens.colors.cyan.text}`}
            >
              <X className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${compact ? 'p-4' : 'p-6'} bg-slate-50/30 dark:bg-slate-800/30`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`${compact ? 'p-4' : 'p-6'} flex justify-end gap-3 border-t-2 ${designTokens.colors.cyan.borderLight} bg-slate-100/50 dark:bg-slate-800/50`}
          >
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
  children,
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
  variant = 'danger',
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
