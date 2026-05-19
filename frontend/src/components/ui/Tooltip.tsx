import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "../../lib/cn";

export interface TooltipProps {
  content: React.ReactNode;
  position?: "top" | "right" | "bottom" | "left";
  delay?: number;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({
  content,
  position = "top",
  delay = 300,
  children,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const posClasses = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  /* arrow rendered as rotated square to match design spec */
  const arrowClasses = {
    top:    "top-full left-1/2 -translate-x-1/2 -mt-1",
    bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-1",
    left:   "left-full top-1/2 -translate-y-1/2 -ml-1",
    right:  "right-full top-1/2 -translate-y-1/2 -mr-1",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(children, {
        "aria-describedby": visible ? "tooltip-content" : undefined,
      })}
      {visible && (
        <span
          id="tooltip-content"
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[800] whitespace-nowrap rounded-md bg-navy-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-soft animate-fade-in",
            posClasses[position],
            className
          )}
        >
          {content}
          <span
            className={cn(
              "absolute h-2 w-2 rotate-45 bg-navy-700",
              arrowClasses[position]
            )}
          />
        </span>
      )}
    </span>
  );
}
