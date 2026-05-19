import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium outline-none transition-all duration-150 ease-ui disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "rounded-md bg-brand-500 text-white shadow-sm hover:bg-brand-600 hover:-translate-y-px active:scale-[0.98] active:bg-brand-700 dark:shadow-brand-950/30",
        secondary:
          "rounded-md border border-navy-100 bg-white text-navy-700 shadow-sm hover:bg-navy-50 hover:border-navy-200 active:scale-[0.98] dark:border-navy-600 dark:bg-navy-700 dark:text-navy-100 dark:hover:bg-navy-600",
        ghost:
          "rounded-md text-navy-700 hover:bg-navy-50 active:scale-[0.98] dark:text-navy-200 dark:hover:bg-navy-800",
        danger:
          "rounded-md bg-danger-500 text-white shadow-sm hover:bg-danger-600 hover:-translate-y-px active:scale-[0.98] active:bg-danger-700",
        "outline-brand":
          "rounded-md border border-brand-500 bg-transparent text-brand-500 hover:bg-brand-50 active:scale-[0.98]",
        link:
          "rounded-md bg-transparent text-brand-500 hover:underline active:scale-[0.98]",
        icon:
          "rounded-md text-navy-500 hover:bg-navy-50 active:scale-[0.98] dark:text-navy-300 dark:hover:bg-navy-700",
      },
      size: {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "rounded-lg px-6 py-3 text-base",
        xl: "rounded-lg px-8 py-4 text-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
