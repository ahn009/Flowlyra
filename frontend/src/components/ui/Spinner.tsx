import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const spinnerVariants = cva("animate-spin rounded-full border-2 border-current", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    },
    color: {
      brand: "text-brand border-brand-200 dark:border-brand-800",
      gray: "text-navy-400 border-navy-200 dark:border-navy-600",
      white: "text-white border-white/30",
    },
  },
  defaultVariants: {
    size: "md",
    color: "brand",
  },
});

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({
  className,
  size,
  color = "brand",
  label = "Loading",
  ...props
}: SpinnerProps) {
  return (
    <div role="status" className={cn("inline-flex items-center", className)} {...props}>
      <svg
        className={cn(spinnerVariants({ size, color: color ?? 'brand' }))}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { spinnerVariants };
