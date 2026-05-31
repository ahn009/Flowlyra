import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InboxLayoutProps {
  chatList: ReactNode;
  conversation: ReactNode;
  details?: ReactNode;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
}

/**
 * Four-panel layout shell for the Inbox / Chat view (Section 21.1).
 *
 * ┌────────────┬──────────────────┬───────────┐
 * │ ChatList   │  Conversation    │  Details  │
 * │  280px     │   flex (1)       │  320px    │
 * └────────────┴──────────────────┴───────────┘
 *
 * Responsive:
 * - Tablet (<1024px): details panel hidden, toggle on demand
 * - Mobile (<768px): single-panel, see MobileInboxLayout
 */
export function InboxLayout({
  chatList,
  conversation,
  details,
  detailsOpen = true,
  onToggleDetails,
}: InboxLayoutProps) {
  return (
    <div className="flex h-[calc(100dvh-56px)] w-full overflow-hidden">
      {/* Chat list — 280px fixed */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-navy-200 bg-white dark:border-navy-700 dark:bg-navy-900 md:flex">
        {chatList}
      </aside>

      {/* Conversation — flex-1 */}
      <main className="flex min-w-0 flex-1 flex-col bg-navy-50 dark:bg-navy-950">
        {conversation}
      </main>

      {/* Details panel — 320px, collapsible on tablet */}
      {details && (
        <aside
          className={cn(
            "shrink-0 flex-col border-l border-navy-200 bg-white dark:border-navy-700 dark:bg-navy-900",
            "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            detailsOpen
              ? "hidden w-[320px] xl:flex"
              : "hidden",
          )}
        >
          {details}
        </aside>
      )}
    </div>
  );
}

/** Mobile: single-panel with bottom tab navigation */
export function MobileInboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col md:hidden">
      {children}
    </div>
  );
}
