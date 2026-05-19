import React from "react";
import { cn } from "../../lib/cn";

export type StatusType = "online" | "busy" | "away" | "offline" | "dnd";

const statusColors: Record<StatusType, string> = {
  online:  "bg-success-500",
  busy:    "bg-brand-500",
  away:    "bg-warning-500",
  offline: "bg-navy-200",
  dnd:     "bg-danger-500",
};

const pulseMap: Record<StatusType, boolean> = {
  online:  false,
  busy:    true,
  away:    false,
  offline: false,
  dnd:     false,
};

const labelMap: Record<StatusType, string> = {
  online:  "Online",
  busy:    "Busy",
  away:    "Away",
  offline: "Offline",
  dnd:     "Do not disturb",
};

export interface StatusDotProps {
  status: StatusType;
  size?: string;
  showPulse?: boolean;
  className?: string;
  label?: boolean;
}

export function StatusDot({
  status,
  size = "h-2.5 w-2.5",
  showPulse: propPulse,
  className,
  label: showLabel = false,
}: StatusDotProps) {
  const shouldPulse = propPulse ?? pulseMap[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex">
        {shouldPulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-pulse-dot rounded-full opacity-75",
              statusColors[status]
            )}
          />
        )}
        <span
          className={cn("relative inline-flex rounded-full", size, statusColors[status])}
          title={labelMap[status]}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-navy-600 dark:text-navy-300">
          {labelMap[status]}
        </span>
      )}
    </span>
  );
}
