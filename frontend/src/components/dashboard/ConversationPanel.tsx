import {
  ArrowRightLeft,
  CheckSquare,
  MoreVertical,
  Paperclip,
  SendHorizontal,
  SmilePlus,
  Tag,
  Zap,
  Bold,
  Italic,
  Link,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { AISuggestionBar } from "./AISuggestionBar";

export interface ConversationMessage {
  id: string;
  sender: "agent" | "visitor" | "bot" | "system";
  content: string;
  senderName?: string;
  timestamp: string;
  /** ISO date string — used to group messages under date headers */
  date: string;
}

interface ConversationPanelProps {
  visitorName: string;
  visitorOnline?: boolean;
  messages: ConversationMessage[];
  aiSuggestion?: string;
  onSend: (text: string) => void;
  onTransfer?: () => void;
  onTag?: () => void;
  onConvertTicket?: () => void;
  onAttachment?: () => void;
  onAiAccept?: (text: string) => void;
  onAiDismiss?: () => void;
}

function groupByDate(messages: ConversationMessage[]): Array<{ date: string; messages: ConversationMessage[] }> {
  const groups: Map<string, ConversationMessage[]> = new Map();
  for (const msg of messages) {
    const list = groups.get(msg.date) ?? [];
    list.push(msg);
    groups.set(msg.date, list);
  }
  return Array.from(groups.entries()).map(([date, msgs]) => ({ date, messages: msgs }));
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-px flex-1 bg-navy-200 dark:bg-navy-700" />
      <span className="text-xs text-navy-400 dark:text-navy-500">{label}</span>
      <span className="h-px flex-1 bg-navy-200 dark:bg-navy-700" />
    </div>
  );
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  if (msg.sender === "system") {
    return (
      <div className="mx-auto my-1 max-w-[85%] rounded-xl bg-brand-50 px-4 py-2 text-center text-[13px] text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
        {msg.content}
      </div>
    );
  }

  const isVisitor = msg.sender === "visitor";

  return (
    <div className={cn("flex flex-col gap-0.5", isVisitor ? "items-end" : "items-start")}>
      {!isVisitor && msg.senderName && (
        <span className="ml-1 text-xs text-navy-500 dark:text-navy-400">{msg.senderName}</span>
      )}
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 text-[15px] leading-relaxed",
          isVisitor
            ? /* Visitor — indigo-600, tight bottom-right */ "bg-brand-600 text-white [border-radius:16px_16px_4px_16px]"
            : msg.sender === "bot"
            ? /* Bot — indigo-50 tint */ "bg-brand-50 text-brand-700 [border-radius:16px_16px_16px_4px] dark:bg-brand-950/40 dark:text-brand-300"
            : /* Agent — slate-100 */ "bg-navy-100 text-navy-800 [border-radius:16px_16px_16px_4px] dark:bg-navy-700 dark:text-navy-100",
        )}
      >
        {msg.content}
      </div>
      <span className={cn("text-[11px] text-navy-400 dark:text-navy-500 mx-1", isVisitor && "text-right")}>
        {msg.timestamp}
      </span>
    </div>
  );
}

const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded text-navy-400 hover:bg-navy-100 hover:text-navy-600 dark:hover:bg-navy-700 dark:hover:text-navy-200 transition-colors";

export function ConversationPanel({
  visitorName,
  visitorOnline = false,
  messages,
  aiSuggestion,
  onSend,
  onTransfer,
  onTag,
  onConvertTicket,
  onAttachment,
  onAiAccept,
  onAiDismiss,
}: ConversationPanelProps) {
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const groups = groupByDate(messages);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  /* Auto-grow textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-navy-200 bg-white px-5 dark:border-navy-700 dark:bg-navy-900">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-semibold text-midnight dark:text-navy-100">{visitorName}</span>
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              visitorOnline ? "bg-success-500" : "bg-navy-300 dark:bg-navy-600",
            )}
          />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onTransfer} className={ICON_BTN} title="Transfer chat">
            <ArrowRightLeft size={16} />
          </button>
          <button type="button" onClick={onTag} className={ICON_BTN} title="Add tag">
            <Tag size={16} />
          </button>
          <button type="button" onClick={onConvertTicket} className={ICON_BTN} title="Convert to ticket">
            <CheckSquare size={16} />
          </button>
          <button type="button" className={ICON_BTN} title="More options">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Message area */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-3">
          {groups.map(({ date, messages: msgs }) => (
            <div key={date}>
              <DateDivider label={date} />
              {msgs.map((msg) => (
                <div key={msg.id} className="mb-2">
                  <MessageBubble msg={msg} />
                </div>
              ))}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="grid min-h-[200px] place-items-center text-sm text-navy-400">
              No messages yet
            </div>
          )}
        </div>
      </div>

      {/* Composition area */}
      <div className="shrink-0 border-t border-navy-200 bg-white dark:border-navy-700 dark:bg-navy-900">
        {/* AI suggestion bar */}
        {aiSuggestion && (
          <div className="px-4 pt-3">
            <AISuggestionBar
              suggestion={aiSuggestion}
              onAccept={(text) => {
                setDraft(text);
                onAiAccept?.(text);
                textareaRef.current?.focus();
              }}
              onDismiss={() => onAiDismiss?.()}
            />
          </div>
        )}

        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 border-b border-navy-100 px-4 py-2 dark:border-navy-800">
          <button type="button" className={ICON_BTN} title="Bold"><Bold size={14} /></button>
          <button type="button" className={ICON_BTN} title="Italic"><Italic size={14} /></button>
          <button type="button" className={ICON_BTN} title="Link"><Link size={14} /></button>
          <span className="mx-1 h-4 w-px bg-navy-200 dark:bg-navy-700" />
          <button type="button" className={ICON_BTN} title="Emoji"><SmilePlus size={14} /></button>
          <button type="button" onClick={onAttachment} className={ICON_BTN} title="Attachment"><Paperclip size={14} /></button>
          <button type="button" className={ICON_BTN} title="Canned reply"><Zap size={14} /></button>

          {/* Send — right-aligned */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim()}
              className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send <SendHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="px-4 py-3" style={{ minHeight: 80 }}>
          <textarea
            ref={textareaRef}
            className="w-full resize-none bg-transparent text-sm text-navy-700 placeholder:text-navy-400 outline-none dark:text-navy-100"
            placeholder="Type your reply... (Ctrl+Enter to send)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            style={{ minHeight: 48 }}
          />
        </div>
      </div>
    </div>
  );
}
