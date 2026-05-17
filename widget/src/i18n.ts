/** Tiny i18n runtime for the widget — catalogs are served by the API. */

const DEFAULT_KEYS = {
  "header.title": "Chat with us",
  "header.online": "Online now",
  "header.offline": "Away for now",
  "welcome.tagline": "Real people answer here.",
  "form.start": "Start a conversation",
  "form.name": "Name",
  "form.email": "Email",
  "form.phone": "Phone",
  "form.subject": "Topic",
  "form.message": "Message",
  "form.send": "Start chat",
  "input.placeholder": "Write a message...",
  "input.send": "Send",
  "input.hint": "Enter to send.",
  "offline.title": "We're offline right now",
  "offline.message": "Leave a message and we'll reply by email.",
  "offline.email": "Your email",
  "offline.submit": "Send message",
  "offline.next_open": "Next opening",
  "offline.success": "Thanks! We'll be in touch.",
  "csat.title": "How was your chat?",
  "csat.thanks": "Thanks for the feedback!",
  "csat.comment": "Anything we should know?",
  "csat.submit": "Submit rating",
  "chat.assigned": "You are chatting with the support team",
  "agent.default_name": "Support agent",
  "typing.someone": "is typing",
  "connection.offline": "Connection lost. Reconnecting...",
  "connection.online": "Reconnected",
  "attachment.label": "Attach file",
  "validation.required": "Required",
  "validation.email": "Please enter a valid email",
  "branding.poweredBy": "Powered by",
  "sound.toggle": "Toggle sound",
  "retry.failed": "Couldn't send — tap to retry",
  "menu.option.account": "Account support",
  "menu.option.account.sub": "Billing, access, profile",
  "menu.option.product": "Product question",
  "menu.option.product.sub": "Plans, setup, features",
  "menu.option.sales": "Talk to sales",
  "menu.option.sales.sub": "Pricing and demos",
} as const;

export type I18nKey = keyof typeof DEFAULT_KEYS;

export class I18n {
  private catalog: Record<string, string>;
  private locale: string;

  constructor(catalog: Record<string, string>, locale: string) {
    this.catalog = { ...DEFAULT_KEYS, ...catalog };
    this.locale = locale;
  }

  t(key: I18nKey | string, fallback?: string): string {
    return this.catalog[key] ?? fallback ?? (DEFAULT_KEYS as Record<string, string>)[key] ?? key;
  }

  setCatalog(catalog: Record<string, string>, locale: string): void {
    this.catalog = { ...DEFAULT_KEYS, ...catalog };
    this.locale = locale;
  }

  current(): string {
    return this.locale;
  }
}

export function detectLocale(supported: string[] | undefined): string | null {
  const supportedSet = new Set((supported ?? []).map((l) => l.toLowerCase()));
  const candidates: string[] = [];
  const navigator = (typeof window !== "undefined" ? window.navigator : undefined) as Navigator | undefined;
  if (!navigator) return null;
  const languages = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean) as string[];
  for (const lang of languages) {
    const code = lang.split("-")[0].toLowerCase();
    candidates.push(code);
    candidates.push(lang.toLowerCase());
  }
  for (const candidate of candidates) {
    if (supportedSet.has(candidate)) return candidate;
  }
  return null;
}
