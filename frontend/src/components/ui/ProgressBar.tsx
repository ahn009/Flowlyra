import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const progressBarVariants = cva("relative h-2 w-full overflow-hidden rounded-full", {
  variants: {
    size: {
      sm: "h-1.5",
      md: "h-2",
      lg: "h-3",
    },
    color: {
      brand: "bg-brand-100 dark:bg-brand-900/30",
      green: "bg-green-100 dark:bg-green-900/30",
      red: "bg-red-100 dark:bg-red-900/30",
      yellow: "bg-yellow-100 dark:bg-yellow-900/30",
      blue: "bg-blue-100 dark:bg-blue-900/30",
      gray: "bg-navy-200 dark:bg-navy-600",
    },
  },
  defaultVariants: {
    size: "md",
    color: "brand",
  },
});

const barColorMap: Record<string, string> = {
  brand: "bg-brand",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  gray: "bg-navy-500",
};

export interface ProgressBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof progressBarVariants> {
  value: number;
  max?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export function ProgressBar({
  className,
  size,
  color = "brand",
  value,
  max = 100,
  showLabel = false,
  animated = true,
  ...props
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-navy-600 dark:text-navy-300">
            {props.children}
          </span>
          <span className="text-sm font-mono font-semibold tabular-nums text-navy-600 dark:text-navy-300">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(progressBarVariants({ size, color: color ?? 'brand' }), className)}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            barColorMap[color || "brand"],
            animated && clampedValue < 100 && "animate-pulse"
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export { progressBarVariants };
