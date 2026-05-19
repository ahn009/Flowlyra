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

const typeConfig: Record<ToastType, { icon: React.ReactNode; iconClass: string }> = {
  success: { icon: <CheckCircle className="h-5 w-5" />, iconClass: "text-success-500" },
  error:   { icon: <AlertCircle className="h-5 w-5" />, iconClass: "text-danger-500" },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, iconClass: "text-warning-500" },
  info:    { icon: <Info className="h-5 w-5" />, iconClass: "text-blue-500" },
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
        "pointer-events-auto flex w-full min-w-[320px] max-w-[420px] items-start gap-3 rounded-lg border border-navy-100 bg-white p-4 shadow-lift dark:bg-navy-800 dark:border-navy-700",
        "animate-slide-in-right",
        isExiting && "animate-slide-out-right"
      )}
      role="alert"
    >
      <span className={cn("mt-0.5 shrink-0", config.iconClass)}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        {data.title && (
          <p className="text-sm font-medium text-navy-700 dark:text-navy-50">{data.title}</p>
        )}
        <p className="mt-0.5 text-xs text-navy-400 dark:text-navy-300">{data.message}</p>
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
