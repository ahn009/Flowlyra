import React, { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      hint,
      error,
      options,
      placeholder,
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
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              "w-full appearance-none rounded-md border border-navy-100 bg-white px-3 py-2 pr-9 text-sm text-navy-700 transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
              "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-300",
              "dark:bg-navy-800 dark:border-navy-600 dark:text-navy-100 dark:focus:ring-brand-500/40",
              error &&
                "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={cn(error && errorId, hint && hintId) || undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options && options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-navy-400">
            <ChevronDown className="h-4 w-4" />
          </span>
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

Select.displayName = "Select";
