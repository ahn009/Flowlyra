import React, { useEffect, useCallback, useRef } from "react";
import { cn } from "../../lib/cn";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => dialogRef.current?.focus(), 0);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
    },
    [closeOnOverlayClick, onClose]
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
        aria-hidden
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col max-h-[85vh] rounded-2xl bg-white border border-navy-100 shadow-lift animate-scale-in",
          "dark:bg-navy-800 dark:border-navy-700",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4 dark:border-navy-700">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-navy-700 dark:text-navy-50">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-navy-400 dark:text-navy-300">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-navy-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-navy-100 px-6 py-4 dark:border-navy-700">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
