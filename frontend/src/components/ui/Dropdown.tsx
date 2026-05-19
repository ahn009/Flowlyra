import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { cn } from "../../lib/cn";
import { ChevronRight, Check } from "lucide-react";
import { createPortal } from "react-dom";

/* ─── Types ─── */
export interface DropdownItem {
  label: React.ReactNode;
  value: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
}

export interface DropdownDivider {
  type: "divider";
}

export interface DropdownGroup {
  type: "group";
  label: string;
  items: DropdownItem[];
}

export type DropdownMenuEntry = DropdownItem | DropdownDivider | DropdownGroup;

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownMenuEntry[];
  align?: "start" | "end";
  className?: string;
  onSelect?: (value: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/* ─── Helpers ─── */
function isItem(entry: DropdownMenuEntry): entry is DropdownItem {
  return "value" in entry;
}

function isDivider(entry: DropdownMenuEntry): entry is DropdownDivider {
  return "type" in entry && entry.type === "divider";
}

function isGroup(entry: DropdownMenuEntry): entry is DropdownGroup {
  return "type" in entry && entry.type === "group";
}

/* ─── Component ─── */
export function Dropdown({
  trigger,
  items,
  align = "end",
  className,
  onSelect,
  isOpen: controlledOpen,
  onOpenChange,
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const setOpen = useCallback(
    (v: boolean) => {
      setInternalOpen(v);
      onOpenChange?.(v);
      if (v) setActiveIndex(-1);
    },
    [onOpenChange]
  );

  // Build flat list for keyboard navigation
  const flatItems = items.filter(isItem);
  const totalCount = flatItems.length;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % totalCount);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + totalCount) % totalCount);
          break;
        case "Enter":
        case " ": {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < totalCount) {
            const item = flatItems[activeIndex];
            if (!item.disabled) {
              item.onSelect?.();
              onSelect?.(item.value);
              setOpen(false);
            }
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          setOpen(false);
          anchorRef.current?.querySelector("button")?.focus();
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    };

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, activeIndex, totalCount, onSelect, setOpen, flatItems]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !menuRef.current) return;
    const activeEl = menuRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let itemCursor = 0;

  const renderEntry = (entry: DropdownMenuEntry) => {
    if (isDivider(entry)) {
      return <div key="divider" className="my-1 h-px bg-navy-200 dark:bg-navy-600" />;
    }

    if (isGroup(entry)) {
      return (
        <div key={entry.label} className="pt-2">
          <div className="px-2 py-1.5 text-2xs font-bold uppercase tracking-wider text-navy-400 dark:text-navy-400">
            {entry.label}
          </div>
          {entry.items.map((item) => {
            const idx = itemCursor;
            itemCursor++;
            return renderItem(item, idx);
          })}
        </div>
      );
    }

    const idx = itemCursor;
    itemCursor++;
    return renderItem(entry, idx);
  };

  const renderItem = (item: DropdownItem, index: number) => {
    const isActive = activeIndex === index;
    return (
      <button
        key={item.value}
        type="button"
        data-index={index}
        role="menuitem"
        disabled={item.disabled}
        onClick={() => {
          if (item.disabled) return;
          item.onSelect?.();
          onSelect?.(item.value);
          setOpen(false);
        }}
        onMouseEnter={() => setActiveIndex(index)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          item.danger
            ? "text-danger hover:bg-danger-50 dark:text-red-400 dark:hover:bg-red-900/20"
            : "text-navy-600 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-600",
          isActive &&
            !item.danger &&
            "bg-navy-100 dark:bg-navy-600",
          isActive &&
            item.danger &&
            "bg-danger-50 dark:bg-red-900/20",
          item.disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {item.icon && (
          <span className="inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">
            {item.icon}
          </span>
        )}
        <span className="flex-1 text-left">{item.label}</span>
        {item.shortcut && (
          <span className="ml-2 text-xs text-navy-400 dark:text-navy-400">
            {item.shortcut}
          </span>
        )}
      </button>
    );
  };

  return (
    <div ref={anchorRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        className="contents"
      >
        {trigger}
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-orientation="vertical"
            className={cn(
              "absolute top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-navy-100 dark:border-navy-700 bg-white py-1 shadow-soft animate-slide-up dark:border-navy-600 dark:bg-navy-700",
              align === "end" ? "right-0" : "left-0"
            )}
          >
            {items.map(renderEntry)}
          </div>,
          anchorRef.current?.parentElement || document.body
        )}
    </div>
  );
}
