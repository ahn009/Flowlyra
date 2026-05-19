import React from "react";
import { cn } from "../../lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "avatar" | "button" | "card";
  width?: string | number;
  height?: string | number;
  lines?: number;
  gap?: string;
}

const defaultSize: Record<string, string> = {
  text:   "h-4 w-full",
  rect:   "h-12 w-full",
  avatar: "h-10 w-10 rounded-full",
  button: "h-10 w-24",
  card:   "h-48 w-full rounded-lg",
};

export function Skeleton({
  className,
  variant = "rect",
  width,
  height,
  lines,
  gap = "0.5rem",
  ...props
}: SkeletonProps) {
  const style: React.CSSProperties = {
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
  };

  const baseClass = cn(
    "skeleton",
    variant === "avatar" ? "rounded-full" : "rounded-md",
    defaultSize[variant],
    className
  );

  if (variant === "text" && lines && lines > 1) {
    return (
      <div className="flex flex-col" style={{ gap }} {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={baseClass}
            style={{ ...style, width: i === lines - 1 ? "75%" : "100%", height: style.height || "1rem" }}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClass} style={style} {...props} />;
}
