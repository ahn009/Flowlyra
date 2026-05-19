import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { X } from "lucide-react";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-navy-50 text-navy-600 dark:bg-navy-700 dark:text-navy-200",
        brand:   "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300",
        success: "bg-success-50 text-success-600 dark:bg-success-50/10 dark:text-success-500",
        warning: "bg-warning-50 text-warning-600 dark:bg-warning-50/10 dark:text-warning-500",
        danger:  "bg-danger-50 text-danger-600 dark:bg-danger-50/10 dark:text-danger-400",
        purple:  "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
        blue:    "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-xs",
      },
      pill: {
        true: "rounded-full px-3",
        false: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      pill: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

const dotColorMap: Record<string, string> = {
  default: "bg-navy-400",
  brand:   "bg-brand-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger:  "bg-danger-500",
  purple:  "bg-purple-500",
  blue:    "bg-blue-500",
};

export function Badge({
  className,
  variant,
  size,
  pill,
  dot = false,
  icon,
  onDismiss,
  children,
  ...props
}: BadgeProps) {
  const v = variant ?? "default";
  return (
    <span
      className={cn(badgeVariants({ variant, size, pill }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full flex-shrink-0",
            dotColorMap[v] ?? "bg-navy-400"
          )}
        />
      )}
      {icon && (
        <span className="inline-flex shrink-0 [&>svg]:h-3 [&>svg]:w-3">
          {icon}
        </span>
      )}
      {children && <span>{children}</span>}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="ml-0.5 inline-flex shrink-0 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export { badgeVariants };
