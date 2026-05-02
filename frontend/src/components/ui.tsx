import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

export function Button({ children, variant = "secondary", size = "md", className, ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold outline-none transition focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-white shadow-sm shadow-blue-900/10 hover:bg-primary-hover",
        variant === "secondary" && "border border-border bg-white text-slate-700 shadow-sm shadow-slate-200/40 hover:border-slate-300 hover:bg-slate-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-danger text-white shadow-sm shadow-red-900/10 hover:bg-red-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Card({ children, className }: CardProps): JSX.Element {
  return <div className={cx("rounded-lg border border-border bg-white shadow-soft", className)}>{children}</div>;
}

interface PageShellProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function PageShell({ children, className }: PageShellProps): JSX.Element {
  return <section className={cx("min-h-[calc(100dvh-64px)] bg-[linear-gradient(180deg,#f8fafc_0%,#f6f8fb_42%,#eef3f8_100%)]", className)}>{children}</section>;
}

interface PanelHeaderProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function PanelHeader({ title, eyebrow, description, action }: PanelHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="min-w-0">
        {eyebrow && <div className="text-xs font-bold uppercase tracking-wide text-muted">{eyebrow}</div>}
        <h2 className="truncate text-base font-black text-ink">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

interface FieldProps {
  readonly label?: string;
  readonly children: ReactNode;
  readonly hint?: string;
}

export function Field({ label, children, hint }: FieldProps): JSX.Element {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-800">
      {label && <span>{label}</span>}
      {children}
      {hint && <span className="text-xs font-normal leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return (
    <textarea
      className={cx(
        "w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      className={cx("h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100", className)}
      {...props}
    />
  );
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly tone?: "blue" | "green" | "yellow" | "red" | "slate";
}

export function MetricCard({ label, value, tone = "slate" }: MetricCardProps): JSX.Element {
  const tones = {
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
    green: "bg-green-50 text-green-800 ring-green-100",
    yellow: "bg-yellow-50 text-yellow-800 ring-yellow-100",
    red: "bg-red-50 text-red-800 ring-red-100",
    slate: "bg-slate-50 text-slate-800 ring-slate-100"
  };
  return (
    <div className={cx("rounded-lg p-3 ring-1", tones[tone])}>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide opacity-75">{label}</div>
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
        {icon && <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-primary ring-1 ring-blue-100">{icon}</div>}
        <h2 className="text-base font-black text-ink">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

interface PillProps {
  readonly children: ReactNode;
  readonly tone?: "blue" | "green" | "yellow" | "red" | "slate" | "orange";
  readonly className?: string;
}

export function Pill({ children, tone = "slate", className }: PillProps): JSX.Element {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-green-50 text-green-700 ring-green-100",
    yellow: "bg-yellow-50 text-yellow-800 ring-yellow-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    orange: "bg-orange-50 text-orange-700 ring-orange-100"
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1", tones[tone], className)}>{children}</span>;
}
