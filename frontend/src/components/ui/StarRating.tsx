import React, { useState, useCallback } from "react";
import { cn } from "../../lib/cn";
import { Star } from "lucide-react";

export interface StarRatingProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function StarRating({
  value: controlledValue,
  defaultValue = 0,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
  className,
  label,
}: StarRatingProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [hoverValue, setHoverValue] = useState(0);

  const currentValue = controlledValue ?? internalValue;
  const displayValue = hoverValue || currentValue;

  const handleStarClick = useCallback(
    (starValue: number) => {
      if (readOnly) return;
      setInternalValue(starValue);
      onChange?.(starValue);
    },
    [readOnly, onChange]
  );

  const handleStarHover = useCallback(
    (starValue: number) => {
      if (readOnly) return;
      setHoverValue(starValue);
    },
    [readOnly]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverValue(0);
  }, []);

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {label && (
        <span className="mr-1 text-sm font-medium text-navy-600 dark:text-navy-300">
          {label}
        </span>
      )}
      <div
        className="flex items-center"
        onMouseLeave={handleMouseLeave}
        role={readOnly ? "img" : "radiogroup"}
        aria-label={label || `${displayValue} out of ${max} stars`}
      >
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= displayValue;

          return (
            <button
              key={starValue}
              type="button"
              role={readOnly ? undefined : "radio"}
              aria-checked={starValue === currentValue}
              aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
              disabled={readOnly}
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => handleStarHover(starValue)}
              className={cn(
                "relative transition-transform",
                !readOnly && "cursor-pointer hover:scale-110",
                readOnly && "cursor-default"
              )}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors",
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-none text-navy-300 dark:text-navy-400"
                )}
              />
            </button>
          );
        })}
      </div>
      {!readOnly && currentValue > 0 && (
        <span className="ml-1.5 text-sm font-medium text-navy-400 dark:text-navy-400">
          {currentValue}/{max}
        </span>
      )}
    </div>
  );
}
