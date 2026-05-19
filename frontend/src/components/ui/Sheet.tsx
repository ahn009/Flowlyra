import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "../../lib/cn";
import { createPortal } from "react-dom";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[];
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  snapPoints,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 0) {
      currentY.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;
    sheetRef.current.style.transition = "transform 200ms ease-out";
    if (currentY.current > 100) {
      onClose();
    } else {
      sheetRef.current.style.transform = "translateY(0)";
    }
    currentY.current = 0;
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Sheet"}
        className={cn(
          "relative max-h-[90vh] rounded-t-2xl border-t border-navy-100 dark:border-navy-700 bg-white shadow-xl animate-slide-up dark:border-navy-600 dark:bg-navy-800",
          "flex flex-col overflow-hidden",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-navy-300 dark:bg-navy-600" />
        </div>
        {/* Header */}
        {(title || description) && (
          <div className="border-b border-navy-100 dark:border-navy-700 px-6 py-3 dark:border-navy-600">
            {title && (
              <h2 className="text-lg font-bold text-navy-700 dark:text-white">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-navy-400 dark:text-navy-400">
                {description}
              </p>
            )}
          </div>
        )}
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
