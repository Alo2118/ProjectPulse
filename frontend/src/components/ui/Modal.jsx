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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
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
