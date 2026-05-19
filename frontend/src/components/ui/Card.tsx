import React from "react";
import { cn } from "../../lib/cn";

/* ─── Standard Card ─── */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  elevated?: boolean;
  dark?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm:   "p-4",
  md:   "p-4 md:p-6",
  lg:   "p-6 md:p-8",
};

export function Card({
  className,
  hover = false,
  elevated = false,
  dark = false,
  padding = "none",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        dark
          ? "rounded-2xl border border-navy-800 bg-navy-900 p-6 md:p-8"
          : elevated
          ? "rounded-2xl bg-white shadow-soft transition-all duration-300 hover:shadow-lift hover:-translate-y-1"
          : "rounded-lg border border-navy-100 bg-white shadow-xs transition-all duration-150 dark:bg-navy-800 dark:border-navy-700",
        hover && !elevated && "hover:shadow-soft hover:border-navy-200 cursor-pointer",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Card Header ─── */
export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ className, title, description, action, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-navy-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-navy-700",
        className
      )}
      {...props}
    >
      {children || (
        <div className="min-w-0">
          {title && <h3 className="text-base font-semibold text-navy-700 dark:text-navy-50">{title}</h3>}
          {description && <p className="mt-0.5 text-sm text-navy-400">{description}</p>}
        </div>
      )}
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ─── Card Body ─── */
export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>{children}</div>
  );
}

/* ─── Card Footer ─── */
export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 border-t border-navy-100 px-5 py-3 dark:border-navy-700", className)}
      {...props}
    >
      {children}
    </div>
  );
}
