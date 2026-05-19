import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { cn } from "../../lib/cn";
import { createPortal } from "react-dom";

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  children,
  position = "bottom",
  align = "center",
  className,
  contentClassName,
  closeOnOutsideClick = true,
  closeOnEsc = true,
  isOpen: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const setOpen = useCallback(
    (v: boolean) => {
      setInternalOpen(v);
      onOpenChange?.(v);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        e.preventDefault();
        setOpen(false);
        anchorRef.current?.querySelector("button")?.focus();
      }
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (!closeOnOutsideClick) return;
      const target = e.target as Node;
      if (
        contentRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("keydown", handleEsc);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, closeOnEsc, closeOnOutsideClick, setOpen]);

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
  };

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  const animationClass = position === "top" ? "animate-slide-down" : "animate-slide-up";

  return (
    <div ref={anchorRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        className="contents"
      >
        {trigger}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={contentRef}
            id={popoverId}
            role="dialog"
            className={cn(
              "absolute z-50 min-w-[8rem] rounded-xl border border-navy-100 dark:border-navy-700 bg-white p-2 shadow-soft dark:border-navy-600 dark:bg-navy-700",
              positionClasses[position],
              alignClasses[align],
              animationClass,
              contentClassName
            )}
          >
            {children}
          </div>,
          anchorRef.current?.parentElement || document.body
        )}
    </div>
  );
}
