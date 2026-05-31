import { X, Zap } from "lucide-react";
import { cn } from "../../lib/cn";

interface AISuggestionBarProps {
  suggestion: string;
  onAccept: (text: string) => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * AI Suggestion bar — appears above composition area (Section 21.3).
 * Background: indigo-50, left border accent, sparkle icon.
 */
export function AISuggestionBar({ suggestion, onAccept, onDismiss, className }: AISuggestionBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-3 py-2",
        "dark:border-brand-900/40 dark:bg-brand-950/30",
        className,
      )}
    >
      <Zap size={14} className="shrink-0 text-brand-600 dark:text-brand-400" />
      <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 shrink-0">
        Suggested reply
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-navy-700 dark:text-navy-300">
        {suggestion}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onAccept(suggestion)}
          className="rounded px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-950/60 transition-colors"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
          className="flex h-6 w-6 items-center justify-center rounded text-navy-400 hover:bg-brand-100 dark:hover:bg-brand-950/60 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
