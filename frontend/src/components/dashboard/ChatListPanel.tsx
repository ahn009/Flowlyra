import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";

export type ChatFilter = "active" | "pending" | "resolved";

const FILTERS: Array<{ key: ChatFilter; label: string }> = [
  { key: "active",   label: "Active" },
  { key: "pending",  label: "Pending" },
  { key: "resolved", label: "Resolved" },
];

/** Coloured initials avatar — deterministic color from name */
function VisitorAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full text-sm font-semibold", colors[idx])}
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </div>
  );
}

export interface ChatListItem {
  id: string;
  visitorName: string;
  preview: string;
  timestamp: string;
  unread?: number;
  status?: "online" | "offline";
}

interface ChatListPanelProps {
  items: ChatListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  filter?: ChatFilter;
  onFilterChange?: (f: ChatFilter) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function ChatListPanel({
  items,
  selectedId,
  onSelect,
  filter = "active",
  onFilterChange,
  searchQuery = "",
  onSearchChange,
}: ChatListPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-navy-200 p-3 dark:border-navy-700">
        <label className="flex items-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 text-sm text-navy-400 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-800">
          <Search size={14} className="shrink-0" />
          <input
            type="search"
            className="h-9 min-w-0 flex-1 bg-transparent py-0 text-sm text-navy-700 placeholder:text-navy-400 outline-none dark:text-navy-100"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </label>

        {/* Filter pills */}
        <div className="mt-2.5 flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange?.(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300"
                  : "text-navy-500 hover:bg-navy-100 dark:text-navy-400 dark:hover:bg-navy-800",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="grid place-items-center py-16 text-center text-sm text-navy-400">
            No conversations
          </div>
        )}
        {items.map((item) => (
          <ChatListRow
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function ChatListRow({
  item,
  selected,
  onSelect,
}: {
  item: ChatListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        "border-b border-navy-100 dark:border-navy-800",
        selected
          ? "bg-brand-50 dark:bg-brand-950/30"
          : "hover:bg-navy-50 dark:hover:bg-navy-800/60",
      )}
      style={{ minHeight: 72 }}
      onClick={() => onSelect(item.id)}
    >
      <VisitorAvatar name={item.visitorName} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-midnight dark:text-navy-100">
            {item.visitorName}
          </span>
          <span className="shrink-0 text-[11px] text-navy-400">{item.timestamp}</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-navy-500 dark:text-navy-400">
          {item.preview}
        </p>
      </div>

      {(item.unread ?? 0) > 0 && (
        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
          {item.unread}
        </span>
      )}
    </button>
  );
}
