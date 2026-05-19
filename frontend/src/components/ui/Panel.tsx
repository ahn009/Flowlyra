import React from "react";
import { cn } from "../../lib/cn";

/* ─── Panel ─── */
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100 dark:border-navy-700 bg-white shadow-soft dark:bg-navy-800 dark:border-navy-600 dark:shadow-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Panel Header ─── */
export interface PanelHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PanelHeader({
  title,
  eyebrow,
  description,
  action,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-navy-100 dark:border-navy-700 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 dark:border-navy-600",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-xs font-bold uppercase tracking-wide text-navy-400 dark:text-navy-400">
            {eyebrow}
          </div>
        )}
        <h2 className="truncate text-base font-black text-navy-700 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-navy-400 dark:text-navy-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ─── Panel Body ─── */
export interface PanelBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function PanelBody({ className, children, ...props }: PanelBodyProps) {
  return (
    <div className={cn("px-4 py-4 sm:px-5", className)} {...props}>
      {children}
    </div>
  );
}
