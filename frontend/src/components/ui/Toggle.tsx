import React, { useId, useState } from "react";
import { cn } from "../../lib/cn";

export interface ToggleProps {
  label?: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
}

const trackSize = { sm: "h-5 w-9", md: "h-6 w-11", lg: "h-7 w-14" };
const knobSize  = { sm: "h-3.5 w-3.5", md: "h-[18px] w-[18px]", lg: "h-6 w-6" };
/* knob translates exactly to right edge: track-width - knob-width - (2 * border ~2px) */
const knobOn    = { sm: "translate-x-[1.125rem]", md: "translate-x-[1.25rem]", lg: "translate-x-[1.625rem]" };

export function Toggle({
  label,
  description,
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  className,
  size = "md",
  id: externalId,
}: ToggleProps) {
  const generatedId = useId();
  const id = externalId || generatedId;
  const descId = description ? `${id}-desc` : undefined;

  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked ?? internalChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    setInternalChecked(next);
    onChange?.(next);
  };

  return (
    <div className={cn("inline-flex items-start gap-3", className)}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={isChecked}
        aria-disabled={disabled}
        aria-describedby={descId}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-ui",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          trackSize[size],
          isChecked ? "bg-brand-500" : "bg-navy-200 dark:bg-navy-600"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-sm transition-transform duration-200 ease-ui",
            knobSize[size],
            isChecked ? knobOn[size] : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={id}
              className="cursor-pointer text-sm font-medium text-navy-700 dark:text-navy-100"
            >
              {label}
            </label>
          )}
          {description && (
            <p id={descId} className="mt-0.5 text-xs text-navy-400 dark:text-navy-400">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
