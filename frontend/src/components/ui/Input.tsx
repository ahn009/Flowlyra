import React, { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";
import { X } from "lucide-react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      value,
      onChange,
      id: externalId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const hasValue = value !== undefined && value !== "";
    const showClear = clearable && hasValue;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-navy-700 dark:text-navy-100"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-navy-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              "w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 placeholder:text-navy-300 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
              "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-300",
              "dark:bg-navy-800 dark:border-navy-600 dark:text-navy-50 dark:placeholder:text-navy-400 dark:focus:ring-brand-500/40",
              "dark:disabled:bg-navy-900",
              leftIcon && "pl-10",
              (showClear || rightIcon) && "pr-10",
              error &&
                "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={cn(error && errorId, hint && hintId) || undefined}
            {...props}
          />
          {showClear ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-navy-400 hover:text-navy-600"
              aria-label="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            rightIcon && (
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-navy-400">
                {rightIcon}
              </span>
            )
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="mt-1 text-xs text-navy-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
