import React, { useCallback, useEffect, useState, useRef } from "react";
import { cn } from "../../lib/cn";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { createPortal } from "react-dom";

/* ─── Types ─── */
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastContextValue {
  toast: (data: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const typeConfig: Record<ToastType, { icon: React.ReactNode; iconClass: string; bg: string; border: string }> = {
  success: { icon: <CheckCircle className="h-5 w-5" />, iconClass: "text-success-500", bg: "bg-success-50 dark:bg-success-950/30", border: "border-l-[3px] border-l-success-500 border-t border-t-success-100 border-r border-r-success-100 border-b border-b-success-100 dark:border-l-success-500 dark:border-t-success-900/40 dark:border-r-success-900/40 dark:border-b-success-900/40" },
  error:   { icon: <AlertCircle className="h-5 w-5" />,  iconClass: "text-danger-500",  bg: "bg-danger-50 dark:bg-danger-950/30",   border: "border-l-[3px] border-l-danger-500 border-t border-t-danger-100 border-r border-r-danger-100 border-b border-b-danger-100 dark:border-l-danger-500 dark:border-t-danger-900/40 dark:border-r-danger-900/40 dark:border-b-danger-900/40" },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, iconClass: "text-warning-500", bg: "bg-warning-50 dark:bg-warning-950/30",  border: "border-l-[3px] border-l-warning-500 border-t border-t-warning-100 border-r border-r-warning-100 border-b border-b-warning-100 dark:border-l-warning-500 dark:border-t-warning-900/40 dark:border-r-warning-900/40 dark:border-b-warning-900/40" },
  info:    { icon: <Info className="h-5 w-5" />,          iconClass: "text-brand-600",   bg: "bg-brand-50 dark:bg-brand-950/30",     border: "border-l-[3px] border-l-brand-600 border-t border-t-brand-100 border-r border-r-brand-100 border-b border-b-brand-100 dark:border-l-brand-500 dark:border-t-brand-900/40 dark:border-r-brand-900/40 dark:border-b-brand-900/40" },
};

interface ToastItemProps {
  data: ToastData;
  onDismiss: (id: string) => void;
  isExiting?: boolean;
}

function ToastItem({ data, onDismiss, isExiting }: ToastItemProps) {
  const config = typeConfig[data.type];
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = data.duration ?? 5000;

  useEffect(() => {
    if (isHovered) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    timerRef.current = setTimeout(() => onDismiss(data.id), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data.id, duration, onDismiss, isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "pointer-events-auto flex w-full min-w-[320px] max-w-[420px] items-start gap-3 rounded-lg p-4 shadow-lift",
        config.bg,
        config.border,
        "animate-slide-in-right",
        isExiting && "animate-slide-out-right"
      )}
      role="alert"
    >
      <span className={cn("mt-0.5 shrink-0", config.iconClass)}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        {data.title && (
          <p className="text-sm font-semibold text-navy-800 dark:text-navy-50">{data.title}</p>
        )}
        <p className={cn("text-sm text-navy-600 dark:text-navy-300", data.title && "mt-0.5 text-xs")}>{data.message}</p>
        {data.action && (
          <button
            type="button"
            onClick={data.action.onClick}
            className="mt-2 text-xs font-medium text-brand-500 hover:text-brand-600"
          >
            {data.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(data.id)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-navy-300 hover:text-navy-600 dark:hover:text-navy-200"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  maxToasts?: number;
}

let toastCounter = 0;

export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }, 200);
  }, []);

  const dismissAll = useCallback(() => { setToasts([]); setExitingIds(new Set()); }, []);

  const addToast = useCallback(
    (data: Omit<ToastData, "id">): string => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { ...data, id }].slice(-maxToasts));
      return id;
    },
    [maxToasts]
  );

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss, dismissAll }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="true"
            className={cn("fixed z-[500] flex flex-col gap-2 pointer-events-none", positionClasses[position])}
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} data={t} onDismiss={dismiss} isExiting={exitingIds.has(t.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
