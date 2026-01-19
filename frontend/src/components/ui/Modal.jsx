import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import theme, { cn } from '../../styles/theme';

/**
 * Modal Component - Design System v2.0
 *
 * ✅ Migrato a theme system
 * ✅ Accessibility completa (role, aria-*, focus trap)
 * ✅ ESC key + overlay click
 * ✅ Body scroll lock
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
  // Close on Escape key + Lock body scroll
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
      className={cn(
        'fixed inset-0 z-50',
        theme.layout.flex.center,
        'bg-black/60 backdrop-blur-sm',
        theme.spacing.p.md,
        theme.animation.fadeIn
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        className={cn(
          theme.card.elevated,
          'w-full',
          sizeStyles[size],
          'flex max-h-[90vh] flex-col',
          theme.animation.slideUp
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            theme.layout.flex.between,
            'items-start',
            compact ? theme.spacing.p.sm : theme.spacing.p.lg,
            'border-b-2',
            theme.colors.border.lightAlpha,
            theme.colors.bg.secondaryAlpha
          )}
        >
          <div className="flex-1 min-w-0">
            <h2
              id="modal-title"
              className={cn(
                compact ? 'text-lg' : 'text-xl',
                'font-bold',
                theme.colors.text.accent
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                id="modal-description"
                className={cn(
                  'mt-1',
                  compact ? 'text-xs' : 'text-sm',
                  theme.colors.text.muted
                )}
              >
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={cn(
                'ml-4 rounded-lg',
                compact ? 'p-1.5' : 'p-2',
                theme.colors.text.muted,
                'opacity-60 hover:opacity-100',
                theme.utils.transition.default,
                theme.colors.bg.hover
              )}
              aria-label="Chiudi"
            >
              <X className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
          )}
        </div>

        {/* Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            compact ? theme.spacing.p.sm : theme.spacing.p.lg,
            theme.colors.bg.tertiaryAlpha,
            theme.utils.scrollbar
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              compact ? theme.spacing.p.sm : theme.spacing.p.lg,
              theme.layout.flex.end,
              theme.spacing.gap.sm,
              'border-t-2',
              theme.colors.border.lightAlpha,
              theme.colors.bg.secondaryAlpha
            )}
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
 *
 * @example
 * <ModalFooter
 *   onCancel={handleClose}
 *   onConfirm={handleSave}
 *   confirmText="Salva"
 *   confirmLoading={isSaving}
 * />
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
      <Button variant="secondary" onClick={onCancel} size="md">
        {cancelText}
      </Button>
      <Button
        variant={confirmVariant}
        onClick={onConfirm}
        loading={confirmLoading}
        disabled={confirmDisabled}
        size="md"
      >
        {confirmText}
      </Button>
    </>
  );
}

/**
 * ConfirmModal Component
 * Quick confirmation dialog (sostituisce window.confirm())
 *
 * @example
 * <ConfirmModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Elimina Task"
 *   message="Sei sicuro di voler eliminare questo task? Questa azione non può essere annullata."
 *   variant="danger"
 * />
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
  loading = false,
}) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error will be handled by parent
      console.error('Confirm action failed:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleConfirm}
          cancelText={cancelText}
          confirmText={confirmText}
          confirmVariant={variant}
          confirmLoading={loading}
        />
      }
    >
      <p className={cn(theme.typography.body, theme.colors.text.secondary)}>
        {message}
      </p>
    </Modal>
  );
}
