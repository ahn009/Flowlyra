/**
 * FlowLyra — Backward-compatible UI exports
 * New code should import from "@/components/ui" instead.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../stores/themeStore";

export { cx } from "./ui/index";

// Re-export from new component library
export { Button } from "./ui/Button";
export { Card } from "./ui/Card";
export { Panel } from "./ui/Panel";
export { Tabs } from "./ui/Tabs";
export { Badge } from "./ui/Badge";
export { Avatar } from "./ui/Avatar";
export { Spinner } from "./ui/Spinner";
export { Skeleton } from "./ui/Skeleton";
export { EmptyState } from "./ui/EmptyState";
export { Input as TextInput } from "./ui/Input";
export { Textarea as TextArea } from "./ui/Textarea";
export { Select as SelectInput } from "./ui/Select";
export { SearchInput } from "./ui/SearchInput";
export { Modal } from "./ui/Modal";
export { Drawer } from "./ui/Drawer";
export { Dropdown } from "./ui/Dropdown";
export { Tooltip } from "./ui/Tooltip";
export { Accordion } from "./ui/Accordion";
export { ProgressBar } from "./ui/ProgressBar";
export { ChatBubble } from "./ui/ChatBubble";
export { StatusDot } from "./ui/StatusDot";
export { StarRating } from "./ui/StarRating";
export { PricingCard } from "./ui/PricingCard";
export { FilePreview } from "./ui/FilePreview";
export { Toggle } from "./ui/Toggle";
export { Checkbox } from "./ui/Checkbox";
export { useToast, ToastProvider } from "./ui/Toast";
export type { ToastType, ToastData } from "./ui/Toast";

// Legacy components kept for backward compatibility

export function PageShell({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <section className={`page-enter min-h-[calc(100dvh-56px)] ${className ?? ""}`}>{children}</section>;
}

export function PanelHeader({ title, eyebrow, description, action }: { title: string; eyebrow?: string; description?: string; action?: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 border-b border-navy-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 dark:border-navy-700">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300 dark:text-navy-500">{eyebrow}</div>}
        <h2 className="truncate text-base font-semibold font-display text-navy-700 dark:text-navy-100">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-navy-400 dark:text-navy-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label?: string; children: ReactNode; hint?: string }): JSX.Element {
  return (
    <label className="grid gap-1.5 text-sm">
      {label && <span className="font-medium text-navy-700 dark:text-navy-200">{label}</span>}
      {children}
      {hint && <span className="text-xs font-normal leading-5 text-navy-400 dark:text-navy-500">{hint}</span>}
    </label>
  );
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly tone?: "blue" | "green" | "yellow" | "red" | "slate";
}

export function MetricCard({ label, value, tone = "slate" }: MetricCardProps): JSX.Element {
  const tones = {
    blue: "border-brand-100 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-900/40",
    green: "border-success-100 bg-success-50 dark:bg-success-950/30 dark:border-success-900/40",
    yellow: "border-warning-100 bg-warning-50 dark:bg-warning-950/30 dark:border-warning-900/40",
    red: "border-danger-100 bg-danger-50 dark:bg-danger-950/30 dark:border-danger-900/40",
    slate: "border-navy-100 bg-white dark:bg-navy-800 dark:border-navy-700"
  };
  const valueColors = {
    blue: "text-brand-600 dark:text-brand-300",
    green: "text-success-600 dark:text-success-400",
    yellow: "text-warning-600 dark:text-warning-400",
    red: "text-danger-600 dark:text-danger-400",
    slate: "text-navy-700 dark:text-navy-100"
  };
  return (
    <div className={`rounded-lg border p-4 shadow-xs ${tones[tone]}`}>
      <div className={`text-2xl font-semibold tracking-tight font-display ${valueColors[tone]}`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-navy-400 dark:text-navy-500">{label}</div>
    </div>
  );
}

interface EmptyPanelProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyPanel({ icon, title, description, action }: EmptyPanelProps): JSX.Element {
  return (
    <div className="grid min-h-60 place-items-center p-6 text-center">
      <div className="max-w-sm">
        {icon && <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-navy-50 text-navy-300 dark:bg-navy-800 dark:text-navy-600">{icon}</div>}
        <h2 className="text-base font-semibold font-display text-navy-700 dark:text-navy-100">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-navy-400 dark:text-navy-400">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

interface PillProps {
  readonly children: ReactNode;
  readonly tone?: "blue" | "green" | "yellow" | "red" | "slate" | "orange" | "brand";
  readonly className?: string;
}

export function Pill({ children, tone = "slate", className }: PillProps): JSX.Element {
  const tones = {
    blue: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-50/10 dark:text-brand-400 dark:ring-brand-900/40",
    green: "bg-success-50 text-success-600 ring-success-100 dark:bg-success-50/10 dark:text-success-500 dark:ring-success-900/40",
    yellow: "bg-warning-50 text-warning-600 ring-warning-100 dark:bg-warning-50/10 dark:text-warning-500 dark:ring-warning-900/40",
    red: "bg-danger-50 text-danger-600 ring-danger-100 dark:bg-danger-50/10 dark:text-danger-400 dark:ring-danger-900/40",
    slate: "bg-navy-50 text-navy-600 ring-navy-100 dark:bg-navy-50/10 dark:text-navy-300 dark:ring-navy-700/40",
    orange: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-50/10 dark:text-brand-400 dark:ring-brand-900/40",
    brand: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-50/10 dark:text-brand-400 dark:ring-brand-900/40"
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1 ${tones[tone]} ${className ?? ""}`}>{children}</span>;
}

export function ThemeToggle(): JSX.Element {
  const { theme, toggle } = useThemeStore();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-8 w-8 items-center justify-center rounded-md text-navy-500 hover:bg-navy-50 transition-colors dark:text-navy-400 dark:hover:bg-navy-800"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
