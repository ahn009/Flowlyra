import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "../../lib/cn";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  key: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  mode?: "single" | "multiple";
  defaultOpenKeys?: string[];
  openKeys?: string[];
  onChange?: (openKeys: string[]) => void;
  className?: string;
}

export function Accordion({
  items,
  mode = "single",
  defaultOpenKeys = [],
  openKeys: controlledOpen,
  onChange,
  className,
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = useState<string[]>(defaultOpenKeys);
  const openKeys = controlledOpen ?? internalOpen;

  const toggle = useCallback(
    (key: string) => {
      const isOpen = openKeys.includes(key);
      let next: string[];

      if (mode === "single") {
        next = isOpen ? [] : [key];
      } else {
        next = isOpen
          ? openKeys.filter((k) => k !== key)
          : [...openKeys, key];
      }

      setInternalOpen(next);
      onChange?.(next);
    },
    [openKeys, mode, onChange]
  );

  return (
    <div className={cn("divide-y divide-border dark:divide-slate-600", className)}>
      {items.map((item) => {
        const isOpen = openKeys.includes(item.key);
        return (
          <AccordionSection
            key={item.key}
            item={item}
            isOpen={isOpen}
            onToggle={() => !item.disabled && toggle(item.key)}
          />
        );
      })}
    </div>
  );
}

/* ─── Accordion Section ─── */
interface AccordionSectionProps {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionSection({ item, isOpen, onToggle }: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!contentRef.current) return;
    if (isOpen) {
      setContentHeight(contentRef.current.scrollHeight);
    } else {
      setContentHeight(0);
    }
  }, [isOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={item.disabled}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors",
          item.disabled && "cursor-not-allowed opacity-50",
          !item.disabled && "hover:bg-navy-50 dark:hover:bg-navy-900/40"
        )}
      >
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-navy-700 dark:text-navy-200">
            {item.title}
          </span>
          {item.description && (
            <span className="mt-0.5 text-xs text-navy-400 dark:text-navy-400">
              {item.description}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-navy-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: contentHeight ?? 0 }}
      >
        <div ref={contentRef} className="px-4 pb-4 text-sm text-navy-500 dark:text-navy-300">
          {item.content}
        </div>
      </div>
    </div>
  );
}
