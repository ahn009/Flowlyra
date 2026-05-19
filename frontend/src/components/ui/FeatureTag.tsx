import React from "react";
import { cn } from "../../lib/cn";

export interface FeatureTagProps {
  name: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle";
}

export function FeatureTag({
  name,
  icon,
  className,
  variant = "default",
}: FeatureTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-semibold",
        variant === "default" && [
          "bg-brand-50 text-brand-700 ring-1 ring-brand-500/20",
          "dark:bg-brand-900/20 dark:text-brand-300 dark:ring-brand-400/30",
        ],
        variant === "subtle" && [
          "bg-brand-50 text-brand-600",
          "dark:bg-brand-900/10 dark:text-brand-400",
        ],
        "px-2.5 py-1 text-xs",
        className
      )}
    >
      {icon && (
        <span className="inline-flex shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
      )}
      {name}
    </span>
  );
}
