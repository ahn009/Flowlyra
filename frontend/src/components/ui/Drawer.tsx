import React, { useEffect, useCallback, useRef } from "react";
import { cn } from "../../lib/cn";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
  footer,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className,
}: DrawerProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) previousFocusRef.current = document.activeElement as HTMLElement;
    else previousFocusRef.current?.focus();
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
    <div className="fixed inset-0 z-[300] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Drawer"}
        className={cn(
          "relative flex h-full w-full flex-col border-l border-navy-100 bg-white shadow-lift animate-slide-in-right dark:border-navy-700 dark:bg-navy-800",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4 dark:border-navy-700">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-navy-700 dark:text-navy-50">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-navy-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 dark:hover:bg-navy-700"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center gap-3 border-t border-navy-100 px-6 py-4 dark:border-navy-700">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
