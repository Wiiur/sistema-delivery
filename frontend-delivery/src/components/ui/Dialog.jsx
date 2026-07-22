// src/components/ui/Dialog.jsx
// ⚡ Modal acessível: Esc para fechar, trap de foco, backdrop clicável, scroll-lock
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Dialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',            // 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideCloseButton = false,
  testId
}) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    // Focus trap básico
    const trap = (e) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    const onKey = (e) => {
      if (closeOnEsc && e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      trap(e);
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Foco inicial no diálogo
    setTimeout(() => {
      const first = dialogRef.current?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const sizeCls = {
    sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl'
  }[size] || 'max-w-lg';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      data-testid={testId || 'dialog'}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 font-theme animate-in fade-in"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        className={`relative w-full ${sizeCls} max-h-[92vh] rounded-card bg-bg-surface border border-stroke shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || icon || !hideCloseButton) && (
          <div className="flex items-start gap-4 p-5 sm:p-6 border-b border-stroke bg-bg-input rounded-t-card">
            {icon && (
              <div className="w-11 h-11 rounded-theme bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && <h2 id="dialog-title" className="text-lg sm:text-xl font-black text-tx-main tracking-tight leading-tight">{title}</h2>}
              {subtitle && <p className="text-xs font-bold uppercase tracking-widest text-tx-muted mt-1">{subtitle}</p>}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                data-testid="dialog-close"
                className="shrink-0 p-2 rounded-theme text-tx-muted hover:bg-bg-surface hover:text-red-500 transition-colors border border-transparent hover:border-stroke"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">{children}</div>
        {footer && (
          <div className="border-t border-stroke p-4 sm:p-5 bg-bg-input rounded-b-card">{footer}</div>
        )}
      </div>
    </div>
  );
}
