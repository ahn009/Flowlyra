import React from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center text-navy-200 dark:text-navy-600">
          <span className="[&>svg]:h-full [&>svg]:w-full">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-semibold text-navy-700 dark:text-navy-100 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-navy-400 dark:text-navy-400 max-w-md mb-6 leading-relaxed">{description}</p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
