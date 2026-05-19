import React, { useState, useRef, useCallback, useId } from "react";
import { cn } from "../../lib/cn";

export interface TabItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  variant?: "underline" | "pill";
  className?: string;
  contentClassName?: string;
}

export function Tabs({
  items,
  activeKey: controlledActive,
  defaultActiveKey,
  onChange,
  variant = "underline",
  className,
  contentClassName,
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(
    defaultActiveKey || items[0]?.key || ""
  );
  const activeKey = controlledActive ?? internalActive;
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsId = useId();

  const handleTabClick = useCallback(
    (key: string) => {
      setInternalActive(key);
      onChange?.(key);
    },
    [onChange]
  );

  const activeContent = items.find((item) => item.key === activeKey)?.content;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Tab list */}
      <div
        ref={tabsRef}
        role="tablist"
        aria-orientation="horizontal"
        className={cn(
          "relative flex",
          variant === "underline" && "border-b border-navy-100 dark:border-navy-700 -mb-px gap-0",
          variant === "pill" && "gap-1 rounded-lg bg-navy-50 p-1 dark:bg-navy-800"
        )}
      >
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              data-tab-key={item.key}
              id={`${tabsId}-tab-${item.key}`}
              aria-selected={isActive}
              aria-controls={`${tabsId}-panel-${item.key}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => !item.disabled && handleTabClick(item.key)}
              onKeyDown={(e) => {
                const idx = items.findIndex((i) => i.key === item.key);
                let nextIdx = -1;
                if (e.key === "ArrowRight") nextIdx = (idx + 1) % items.length;
                if (e.key === "ArrowLeft") nextIdx = (idx - 1 + items.length) % items.length;
                if (e.key === "Home") nextIdx = 0;
                if (e.key === "End") nextIdx = items.length - 1;
                if (nextIdx >= 0) {
                  e.preventDefault();
                  const nextItem = items[nextIdx];
                  if (!nextItem.disabled) {
                    handleTabClick(nextItem.key);
                    tabsRef.current
                      ?.querySelector<HTMLButtonElement>(`[data-tab-key="${nextItem.key}"]`)
                      ?.focus();
                  }
                }
              }}
              className={cn(
                "relative inline-flex items-center gap-2 text-sm font-medium transition-colors duration-150 focus:outline-none",
                item.disabled && "cursor-not-allowed opacity-50",
                variant === "underline" && [
                  "px-4 py-2.5 border-b-2",
                  isActive
                    ? "text-brand-500 border-brand-500 dark:text-brand-400 dark:border-brand-400"
                    : "text-navy-400 border-transparent hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200",
                ],
                variant === "pill" && [
                  "rounded-md px-3 py-1.5",
                  isActive
                    ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-navy-100"
                    : "text-navy-400 hover:text-navy-600 dark:hover:text-navy-200",
                ]
              )}
            >
              {item.icon && (
                <span className="inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {items.map((item) => (
        <div
          key={item.key}
          role="tabpanel"
          id={`${tabsId}-panel-${item.key}`}
          aria-labelledby={`${tabsId}-tab-${item.key}`}
          tabIndex={0}
          hidden={item.key !== activeKey}
          className={cn("mt-4 outline-none", contentClassName)}
        >
          {item.key === activeKey && item.content}
        </div>
      ))}
    </div>
  );
}
