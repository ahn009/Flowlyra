const VISIT_COUNT_KEY = "flowlyra_visit_count";
const CHAT_COUNT_KEY = "flowlyra_chat_count";
const LAST_SEEN_KEY = "flowlyra_last_seen";
const VISITED_PAGES_KEY = "flowlyra_visited_pages";

export interface PageRecord {
  url: string;
  title: string;
  enteredAt: string; // ISO string
  timeSpent: number; // seconds
}

export interface SessionSummary {
  visitCount: number;
  chatCount: number;
  lastSeen: string | null;
  visitedPages: PageRecord[];
}

let chatSessionStart: number | null = null;
let currentPageUrl = "";
let currentPageTitle = "";
let currentPageEnteredAt = 0;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota or private mode
  }
}

function flushCurrentPage(): void {
  if (!currentPageUrl || !currentPageEnteredAt) return;
  const spent = Math.floor((Date.now() - currentPageEnteredAt) / 1000);
  const pages = safeGet<PageRecord[]>(VISITED_PAGES_KEY, []);
  const existing = pages.find((p) => p.url === currentPageUrl);
  if (existing) {
    existing.timeSpent += spent;
  } else {
    pages.push({
      url: currentPageUrl,
      title: currentPageTitle,
      enteredAt: new Date(currentPageEnteredAt).toISOString(),
      timeSpent: spent,
    });
  }
  safeSet(VISITED_PAGES_KEY, pages.slice(-20));
}

export function trackPageVisit(url: string, title: string): void {
  flushCurrentPage();

  currentPageUrl = url;
  currentPageTitle = title;
  currentPageEnteredAt = Date.now();

  const visits = safeGet<number>(VISIT_COUNT_KEY, 0) + 1;
  safeSet(VISIT_COUNT_KEY, visits);
  safeSet(LAST_SEEN_KEY, new Date().toISOString());
}

export function startChatSession(): void {
  chatSessionStart = Date.now();
  const chats = safeGet<number>(CHAT_COUNT_KEY, 0) + 1;
  safeSet(CHAT_COUNT_KEY, chats);
}

export function getChatDuration(): string {
  if (!chatSessionStart) return "0s";
  const total = Math.floor((Date.now() - chatSessionStart) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function getSessionSummary(): SessionSummary {
  flushCurrentPage();
  return {
    visitCount: safeGet<number>(VISIT_COUNT_KEY, 0),
    chatCount: safeGet<number>(CHAT_COUNT_KEY, 0),
    lastSeen: safeGet<string | null>(LAST_SEEN_KEY, null),
    visitedPages: safeGet<PageRecord[]>(VISITED_PAGES_KEY, []),
  };
}
