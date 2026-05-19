import React, { forwardRef, useCallback, useEffect, useRef, useId, useState } from "react";
import { cn } from "../../lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  autoResize?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      hint,
      error,
      autoResize = false,
      maxLength,
      showCount = false,
      value,
      onChange,
      id: externalId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const countId = `${id}-count`;
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const [charCount, setCharCount] = useState(
      typeof value === "string" ? value.length : 0
    );

    const adjustHeight = useCallback(() => {
      const el = textareaRef.current || internalRef.current;
      if (!el || !autoResize) return;
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
    }, [autoResize, textareaRef]);

    useEffect(() => {
      adjustHeight();
    }, [adjustHeight, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const showMaxLength = maxLength !== undefined;
    const displayCount = showCount || showMaxLength;
    const isOverLimit = showMaxLength && charCount > maxLength!;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-semibold text-navy-700 dark:text-navy-200"
          >
            {label}
          </label>
        )}
        <textarea
          ref={(el) => {
            (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          }}
          id={id}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          className={cn(
            "w-full resize-none rounded-xl border border-navy-100 dark:border-navy-700 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-navy-400 focus:border-brand focus:ring-4 focus:ring-brand-100 dark:bg-navy-700 dark:text-navy-100 dark:placeholder:text-navy-400 dark:focus:border-brand-400 dark:focus:ring-brand-900/40",
            error &&
              "border-danger focus:border-danger focus:ring-4 focus:ring-danger-100 dark:focus:ring-danger-900/30",
            autoResize && "overflow-hidden",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={cn(
            error && errorId,
            hint && hintId,
            displayCount && countId
          ) || undefined}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {hint && !error && (
              <p
                id={hintId}
                className="text-xs leading-5 text-navy-400 dark:text-navy-400"
              >
                {hint}
              </p>
            )}
            {error && (
              <p
                id={errorId}
                className="text-xs font-medium leading-5 text-danger"
              >
                {error}
              </p>
            )}
          </div>
          {displayCount && (
            <p
              id={countId}
              className={cn(
                "text-xs tabular-nums",
                isOverLimit
                  ? "font-medium text-danger"
                  : "text-navy-400 dark:text-navy-400"
              )}
            >
              {showMaxLength ? `${charCount}/${maxLength}` : charCount}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
