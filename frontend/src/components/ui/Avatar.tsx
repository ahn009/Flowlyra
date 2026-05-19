import React, { useId } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const avatarVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-brand-100 shrink-0",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export type AvatarStatus = "online" | "busy" | "away" | "offline";

export interface AvatarProps
  extends VariantProps<typeof avatarVariants>,
    Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  fallback?: string;
  status?: AvatarStatus;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const statusConfig: Record<AvatarStatus, { color: string; pulse?: boolean }> = {
  online: { color: "bg-success-500" },
  busy:   { color: "bg-brand-500", pulse: true },
  away:   { color: "bg-warning-500" },
  offline:{ color: "bg-navy-200" },
};

const dotSize: Record<string, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2.5 w-2.5 border-[1.5px]",
  md: "h-3 w-3 border-2",
  lg: "h-3 w-3 border-2",
  xl: "h-3.5 w-3.5 border-2",
};

const dotPos: Record<string, string> = {
  xs: "bottom-0 right-0",
  sm: "-bottom-0.5 -right-0.5",
  md: "-bottom-0.5 -right-0.5",
  lg: "-bottom-0.5 -right-0.5",
  xl: "-bottom-0.5 -right-0.5",
};

export function Avatar({
  src,
  alt,
  fallback,
  status,
  size = "md",
  className,
  ...imgProps
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const showImage = src && !imgError;
  const initials = getInitials(fallback || alt);
  const s = size ?? "md";

  return (
    <span className={cn("relative inline-flex", className)}>
      <span className={cn(avatarVariants({ size }))}>
        {showImage ? (
          <img
            src={src}
            alt={alt}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
            {...imgProps}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-medium text-brand-600 dark:text-brand-300">
            {initials}
          </span>
        )}
      </span>
      {status && (
        <span
          className={cn(
            "absolute rounded-full border-white dark:border-navy-800",
            dotSize[s],
            dotPos[s],
            statusConfig[status].color,
            statusConfig[status].pulse && "animate-pulse-dot"
          )}
        />
      )}
    </span>
  );
}

export { avatarVariants };
