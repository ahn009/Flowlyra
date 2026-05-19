import React, { createContext, forwardRef, useId, useContext } from "react";
import { cn } from "../../lib/cn";

/* ─── Radio Group Context ─── */
interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  return useContext(RadioGroupContext);
}

/* ─── RadioGroup ─── */
export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({
  name,
  value,
  onChange,
  disabled = false,
  orientation = "vertical",
  className,
  children,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled }}>
      <div
        role="radiogroup"
        aria-disabled={disabled}
        className={cn(
          "flex",
          orientation === "vertical" ? "flex-col gap-3" : "flex-row flex-wrap gap-4",
          className
        )}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

/* ─── Radio ─── */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  description?: string;
  value: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      label,
      description,
      value,
      id: externalId,
      disabled: propDisabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const descId = description ? `${id}-desc` : undefined;
    const group = useRadioGroup();

    const isDisabled = propDisabled ?? group?.disabled;
    const isChecked = group ? group.value === value : props.checked;

    const handleChange = () => {
      if (!isDisabled) {
        group?.onChange?.(value);
      }
    };

    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex items-start gap-3 cursor-pointer",
          isDisabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span className="relative mt-0.5 flex">
          <input
            ref={ref}
            type="radio"
            id={id}
            name={group?.name}
            value={value}
            checked={isChecked}
            disabled={isDisabled}
            onChange={handleChange}
            className="peer sr-only"
            aria-describedby={descId}
            {...props}
          />
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
              "border-navy-200 bg-white dark:border-navy-400 dark:bg-navy-700",
              "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 dark:peer-focus-visible:ring-brand-900/40",
              "peer-hover:border-navy-300 dark:peer-hover:border-navy-300",
              isChecked &&
                "border-brand dark:border-brand-400"
            )}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full bg-brand transition-transform",
                isChecked ? "scale-100" : "scale-0"
              )}
            />
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

Radio.displayName = "Radio";
