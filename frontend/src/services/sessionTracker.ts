const KEYS = {
  visitCount: "flowlyra_visit_count",
  chatCount: "flowlyra_chat_count",
  lastSeen: "flowlyra_last_seen",
  visitedPages: "flowlyra_visited_pages",
} as const;

export interface PageVisit {
  url: string;
  title: string;
  enteredAt: number;
  timeSpent: number;
}

export interface SessionSummary {
  visitCount: number;
  chatCount: number;
  lastSeen: string | null;
  visitedPages: PageVisit[];
}

let sessionStart: number | null = null;
let currentPage: { url: string; title: string; enteredAt: number } | null = null;

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
    // quota exceeded or private mode — ignore
  }
}

function flushCurrentPage(): void {
  if (!currentPage) return;
  const pages = safeGet<PageVisit[]>(KEYS.visitedPages, []);
  const timeSpent = Math.floor((Date.now() - currentPage.enteredAt) / 1000);
  const idx = pages.findIndex((p) => p.url === currentPage!.url && p.enteredAt === currentPage!.enteredAt);
  if (idx >= 0) {
    pages[idx].timeSpent = timeSpent;
  } else {
    pages.push({ ...currentPage, timeSpent });
  }
  safeSet(KEYS.visitedPages, pages.slice(-50));
}

export function trackPageVisit(url: string, title: string): void {
  flushCurrentPage();
  currentPage = { url, title, enteredAt: Date.now() };
  const count = safeGet<number>(KEYS.visitCount, 0) + 1;
  safeSet(KEYS.visitCount, count);
  safeSet(KEYS.lastSeen, new Date().toISOString());
}

export function startChatSession(): void {
  sessionStart = Date.now();
  const count = safeGet<number>(KEYS.chatCount, 0) + 1;
  safeSet(KEYS.chatCount, count);
}

export function getChatDuration(): string {
  if (!sessionStart) return "0s";
  const total = Math.floor((Date.now() - sessionStart) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function getSessionSummary(): SessionSummary {
  flushCurrentPage();
  return {
    visitCount: safeGet<number>(KEYS.visitCount, 0),
    chatCount: safeGet<number>(KEYS.chatCount, 0),
    lastSeen: safeGet<string | null>(KEYS.lastSeen, null),
    visitedPages: safeGet<PageVisit[]>(KEYS.visitedPages, []),
  };
}
