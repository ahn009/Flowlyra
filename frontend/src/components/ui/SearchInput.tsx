import React, { forwardRef, useState, useCallback, useId, useEffect, useRef } from "react";
import { cn } from "../../lib/cn";
import { Search, X } from "lucide-react";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  onClear?: () => void;
  shortcutHint?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      onClear,
      shortcutHint,
      value,
      onChange,
      onKeyDown,
      id: externalId,
      onFocus,
      onBlur,
      placeholder = "Search...",
      containerClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const inputRef = useRef<HTMLInputElement>(null);

    const [isFocused, setIsFocused] = useState(false);

    const setRef = useCallback(
      (el: HTMLInputElement | null) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      },
      [ref]
    );

    const hasValue = value !== undefined && value !== "";

    const handleClear = useCallback(() => {
      onClear?.();
      inputRef.current?.focus();
    }, [onClear]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape" && hasValue) {
          e.preventDefault();
          handleClear();
        }
        onKeyDown?.(e);
      },
      [onKeyDown, hasValue, handleClear]
    );

    // Global keyboard shortcut
    useEffect(() => {
      if (!shortcutHint) return;
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      };
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }, [shortcutHint]);

    return (
      <div
        className={cn("relative", containerClassName)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {/* Search icon */}
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-navy-400 dark:text-navy-400">
          <Search className="h-4 w-4" />
        </span>

        <input
          ref={setRef}
          id={id}
          type="search"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-xl border border-navy-100 dark:border-navy-700 bg-white pl-10 text-sm outline-none transition placeholder:text-navy-400 dark:bg-navy-700 dark:text-navy-100 dark:placeholder:text-navy-400",
            isFocused
              ? "border-brand ring-4 ring-brand-100 dark:border-brand-400 dark:ring-brand-900/40"
              : "hover:border-navy-200 dark:hover:border-navy-400",
            hasValue && "pr-16",
            !hasValue && shortcutHint && "pr-16",
            className
          )}
          {...props}
        />

        {/* Right side: clear or shortcut hint */}
        {hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-navy-400 hover:text-navy-500 dark:hover:text-navy-300"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : shortcutHint ? (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <kbd className="inline-flex items-center rounded-md border border-navy-100 dark:border-navy-700 bg-navy-50 px-1.5 py-0.5 text-2xs font-medium text-navy-400 dark:border-navy-600 dark:bg-navy-600 dark:text-navy-400">
              {shortcutHint}
            </kbd>
          </span>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
