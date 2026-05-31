import { Globe, Monitor, MapPin, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";

interface Tag { id: string; label: string; color?: string }

interface PastChat { id: string; date: string; status: "resolved" | "open" | "pending" }

interface CustomAttr { key: string; value: string }

export interface DetailsPanelData {
  visitorName: string;
  visitorEmail?: string;
  avatarInitials?: string;
  location?: string;
  browser?: string;
  os?: string;
  tags?: Tag[];
  pastChats?: PastChat[];
  customAttrs?: CustomAttr[];
  onTagAdd?: () => void;
  onTagRemove?: (id: string) => void;
  onChatClick?: (id: string) => void;
}

const TAG_COLORS = [
  "bg-indigo-50 text-indigo-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-violet-50 text-violet-700",
  "bg-sky-50 text-sky-700",
];

const STATUS_STYLES: Record<string, string> = {
  resolved: "bg-emerald-50 text-emerald-700",
  open:     "bg-brand-50 text-brand-600",
  pending:  "bg-amber-50 text-amber-700",
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-navy-100 px-4 py-4 dark:border-navy-800", className)}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DetailsPanel({
  visitorName,
  visitorEmail,
  avatarInitials,
  location,
  browser,
  os,
  tags = [],
  pastChats = [],
  customAttrs = [],
  onTagAdd,
  onTagRemove,
  onChatClick,
}: DetailsPanelData) {
  const [note, setNote] = useState("");
  const initials = avatarInitials ?? visitorName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Visitor header */}
      <Section title="Visitor">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-lg font-bold dark:bg-brand-950 dark:text-brand-300">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-midnight dark:text-navy-100">
              {visitorName}
            </div>
            {visitorEmail && (
              <div className="truncate text-sm text-navy-500 dark:text-navy-400">{visitorEmail}</div>
            )}
            <div className="mt-2 flex flex-col gap-1">
              {location && (
                <span className="flex items-center gap-1.5 text-xs text-navy-500 dark:text-navy-400">
                  <MapPin size={11} className="shrink-0" /> {location}
                </span>
              )}
              {browser && (
                <span className="flex items-center gap-1.5 text-xs text-navy-500 dark:text-navy-400">
                  <Globe size={11} className="shrink-0" /> {browser}
                </span>
              )}
              {os && (
                <span className="flex items-center gap-1.5 text-xs text-navy-500 dark:text-navy-400">
                  <Monitor size={11} className="shrink-0" /> {os}
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Tags */}
      <Section title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={tag.id}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                TAG_COLORS[i % TAG_COLORS.length],
              )}
            >
              {tag.label}
              {onTagRemove && (
                <button
                  type="button"
                  aria-label={`Remove tag ${tag.label}`}
                  onClick={() => onTagRemove(tag.id)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
          {onTagAdd && (
            <button
              type="button"
              onClick={onTagAdd}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
            >
              <Plus size={10} /> Add tag
            </button>
          )}
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <textarea
          className="w-full resize-none rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-700 placeholder:text-navy-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200"
          rows={3}
          placeholder="Add an internal note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          disabled={!note.trim()}
          className="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add note
        </button>
      </Section>

      {/* Chat history */}
      {pastChats.length > 0 && (
        <Section title="Chat history">
          <div className="flex flex-col gap-1.5">
            {pastChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => onChatClick?.(chat.id)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors"
              >
                <span className="text-xs text-navy-600 dark:text-navy-300">{chat.date}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_STYLES[chat.status] ?? "bg-navy-100 text-navy-500")}>
                  {chat.status}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Custom attributes */}
      {customAttrs.length > 0 && (
        <Section title="Custom attributes" className="border-b-0">
          <dl className="flex flex-col gap-2">
            {customAttrs.map((attr) => (
              <div key={attr.key} className="flex justify-between gap-2 text-xs">
                <dt className="font-medium text-navy-500 dark:text-navy-400 truncate">{attr.key}</dt>
                <dd className="truncate text-navy-700 dark:text-navy-200">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}
