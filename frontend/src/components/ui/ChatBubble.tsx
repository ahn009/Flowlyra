import React from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "./Avatar";
import { Bot } from "lucide-react";

export interface ChatAttachment {
  name: string;
  size?: string;
  url?: string;
  type?: string;
}

export interface ChatBubbleProps {
  variant: "visitor" | "agent" | "bot" | "internal-note";
  message: string;
  sender?: {
    name: string;
    avatar?: string;
  };
  timestamp?: string;
  attachments?: ChatAttachment[];
  className?: string;
}

const variantStyles = {
  /* Visitor — indigo-600, right-aligned, tight bottom-right corner — NO directional tail */
  visitor:
    "ml-auto bg-brand-600 text-white [border-radius:16px_16px_4px_16px]",
  /* Agent — slate-100, left-aligned, tight bottom-left corner — NO directional tail */
  agent:
    "mr-auto bg-navy-100 text-navy-700 [border-radius:16px_16px_16px_4px] dark:bg-navy-700 dark:text-navy-100",
  /* Bot — indigo-50, same shape as agent */
  bot:
    "mr-auto bg-brand-50 text-brand-700 [border-radius:16px_16px_16px_4px] dark:bg-brand-950/40 dark:text-brand-300",
  /* Internal note — amber tint, centered */
  "internal-note":
    "mx-auto bg-amber-50 text-amber-900 border border-amber-200 rounded-xl dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/40",
};

export function ChatBubble({
  variant,
  message,
  sender,
  timestamp,
  attachments,
  className,
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-[80%]",
        variant === "visitor" && "flex-row-reverse",
        variant === "internal-note" && "max-w-[90%]",
        className
      )}
    >
      {/* Avatar for agent/bot */}
      {variant === "agent" && (
        <Avatar
          src={sender?.avatar}
          alt={sender?.name || "Agent"}
          fallback={sender?.name || "Agent"}
          size="sm"
          className="mt-1 shrink-0"
        />
      )}
      {variant === "bot" && (
        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand dark:bg-brand-900/30 dark:text-brand-400">
          <Bot className="h-4 w-4" />
        </span>
      )}
      {variant === "visitor" && <span />}

      {/* Bubble */}
      <div className="flex flex-col gap-1">
        {sender && variant !== "visitor" && (
          <span className="text-xs font-semibold text-navy-400 dark:text-navy-400">
            {sender.name}
            {variant === "internal-note" && (
              <span className="ml-1.5 text-yellow-600 dark:text-yellow-400">
                (internal note)
              </span>
            )}
          </span>
        )}

        <div className={cn("px-4 py-2.5 text-sm leading-6", variantStyles[variant])}>
          <p className="whitespace-pre-wrap break-words">{message}</p>
        </div>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className={cn(
            "flex flex-col gap-1.5",
            variant === "visitor" ? "items-end" : "items-start"
          )}>
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                  variant === "visitor"
                    ? "border-white/20 bg-white/10 text-white/90"
                    : "border-navy-100 dark:border-navy-700 bg-white text-navy-600 dark:border-navy-600 dark:bg-navy-700 dark:text-navy-300"
                )}
              >
                <span className="truncate font-medium">{file.name}</span>
                {file.size && (
                  <span className="shrink-0 text-[10px] opacity-60">
                    {file.size}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <span
            className={cn(
              "text-2xs text-navy-400 dark:text-navy-400",
              variant === "visitor" ? "text-right" : "text-left"
            )}
          >
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
