import React, { useCallback, useId, useState } from "react";
import { cn } from "../../lib/cn";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  label?: string;
  hint?: string;
  formatValue?: (value: number) => string;
  className?: string;
  id?: string;
}

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value: controlledValue,
  defaultValue = 0,
  onChange,
  onChangeEnd,
  disabled = false,
  showValue = false,
  label,
  hint,
  formatValue,
  className,
  id: externalId,
}: SliderProps) {
  const generatedId = useId();
  const id = externalId || generatedId;

  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = controlledValue ?? internalValue;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setInternalValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  const handlePointerUp = useCallback(() => {
    onChangeEnd?.(currentValue);
  }, [onChangeEnd, currentValue]);

  const displayValue = formatValue
    ? formatValue(currentValue)
    : currentValue;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-semibold text-navy-700 dark:text-navy-200"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-mono font-semibold tabular-nums text-navy-600 dark:text-navy-300">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          onPointerUp={handlePointerUp}
          disabled={disabled}
          className={cn(
            "peer h-2 w-full cursor-pointer appearance-none rounded-full bg-navy-200 outline-none transition dark:bg-navy-600",
            disabled && "cursor-not-allowed opacity-50",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition [&::-moz-range-thumb]:hover:scale-110",
            "focus-visible:ring-4 focus-visible:ring-brand-100 dark:focus-visible:ring-brand-900/40"
          )}
          style={{
            background: `linear-gradient(to right, #FF5100 0%, #FF5100 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
          }}
        />
      </div>
      {hint && (
        <p className="text-xs leading-5 text-navy-400 dark:text-navy-400">
          {hint}
        </p>
      )}
    </div>
  );
}
