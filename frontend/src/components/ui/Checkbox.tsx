import React, { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      indeterminate = false,
      id: externalId,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const descId = description ? `${id}-desc` : undefined;

    const innerRef = React.useRef<HTMLInputElement>(null);

    const setRef = (el: HTMLInputElement | null) => {
      (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    };

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <label htmlFor={id} className={cn("inline-flex items-start gap-3 cursor-pointer", className)}>
        <span className="relative mt-0.5 flex">
          <input
            ref={setRef}
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            aria-describedby={descId}
            {...props}
          />
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
              "border-navy-200 bg-white dark:border-navy-400 dark:bg-navy-700",
              "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 dark:peer-focus-visible:ring-brand-900/40",
              "peer-hover:border-navy-300 dark:peer-hover:border-navy-300",
              (checked || indeterminate) &&
                "border-brand bg-brand text-white dark:border-brand-400 dark:bg-brand-500",
              props.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {checked && !indeterminate && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            {indeterminate && <Minus className="h-3.5 w-3.5 stroke-[3]" />}
          </span>
        </span>
        {(label || description) && (
          <span className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-navy-700 dark:text-navy-200">
                {label}
              </span>
            )}
            {description && (
              <span
                id={descId}
                className="mt-0.5 text-xs leading-5 text-navy-400 dark:text-navy-400"
              >
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
