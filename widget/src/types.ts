export type WidgetState = "HIDDEN" | "BUBBLE" | "PRECHAT" | "CHATTING" | "WAITING" | "CSAT" | "OFFLINE" | "RATING_REQUEST";

export interface FlowLyraConfig {
  orgSlug: string;
  apiUrl?: string;
  widgetSlug?: string;
  locale?: string;
  autoOpen?: boolean;
  visitor?: VisitorPayload;
  lazy?: boolean;
  requestPreciseLocation?: boolean;
}

export interface VisitorPayload {
  name?: string;
  email?: string;
  phone?: string;
  locale?: string;
  custom_variables?: Record<string, string | number | boolean | null>;
}

export interface PreChatFieldDef {
  name: string;
  type?: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  show_if?: { field: string; equals?: string; in?: string[] };
  pattern?: string;
}

export interface PreChatFormConfig {
  enabled?: boolean;
  fields?: (string | PreChatFieldDef)[];
}

export interface EyeCatcher {
  enabled?: boolean;
  image_url?: string | null;
  text?: string | null;
}

export interface WidgetConfig {
  color: string;
  greeting: string;
  greetings?: string[];
  logo_url: string | null;
  position: string;
  theme: "light" | "dark" | "auto" | string;
  pre_chat_form: PreChatFormConfig;
  post_chat_survey: { enabled?: boolean; type?: string };
  custom_css: string | null;
  custom_js?: string | null;
  eye_catcher?: EyeCatcher;
  white_label?: boolean;
  brand_text?: string | null;
  brand_url?: string | null;
  sound_enabled?: boolean;
  lazy_load?: boolean;
  allow_attachments?: boolean;
  max_upload_mb?: number;
  locale?: string;
  supported_locales?: string[];
  giphy_api_key?: string | null;
}

export interface WidgetInitResponse {
  organization_id: string;
  widget_slug?: string | null;
  session_token: string;
  existing_chat_id: string | null;
  is_online: boolean;
  is_within_hours: boolean;
  next_open_at: string | null;
  widget_config: WidgetConfig;
  i18n: Record<string, string>;
  visitor?: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    custom_variables?: Record<string, unknown>;
  } | null;
}

export interface ProactiveTrigger {
  id: string;
  name: string;
  trigger_type: string;
  conditions: Record<string, unknown>;
  message: string;
  sent_count?: number;
  is_returning?: boolean;
}

export interface MessageMetadata {
  card?: { title?: string; subtitle?: string; image_url?: string; buttons?: { label: string; url?: string; payload?: string }[] };
  carousel?: { items: MessageMetadata["card"][] };
  quick_replies?: { label: string; payload?: string }[];
  image_url?: string;
  video_url?: string;
  location?: { lat: number; lng: number; label?: string };
  list?: { title?: string; items: { title: string; subtitle?: string; payload?: string }[] };
  product?: { name: string; price?: number; currency?: string; image_url?: string; product_url?: string; description?: string };
  agent?: { id?: string; name?: string; avatar_url?: string };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_type: "customer" | "agent" | "system" | "bot";
  content: string | null;
  content_type: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_mime?: string | null;
  is_internal: boolean;
  is_read?: boolean;
  metadata?: MessageMetadata | null;
  created_at: string;
}

export interface StartChatPayload {
  organization_id: string;
  session_token: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  custom_fields?: Record<string, string>;
}

export interface PreChatData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  custom_fields?: Record<string, string>;
}

export interface WidgetHistoryResponse {
  messages: Message[];
}

export interface SuggestedArticle {
  id?: string;
  title: string;
  url: string;
  summary?: string | null;
  snippet?: string | null;
}

export interface FlowLyraInstance {
  open(): void;
  close(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  destroy(): void;
  identify(visitor: VisitorPayload): Promise<void>;
  setVisitor(visitor: VisitorPayload): Promise<void>;
  setName(name: string): Promise<void>;
  setEmail(email: string): Promise<void>;
  setPhone(phone: string): Promise<void>;
  setCustomVariables(vars: Record<string, string | number | boolean | null>): Promise<void>;
  set(key: string, value: string | number | boolean | null): Promise<void>;
  setLocale(locale: string): Promise<void>;
  track(name: string, properties?: Record<string, unknown>, value?: number): Promise<void>;
  trackEvent(name: string, properties?: Record<string, unknown>, value?: number): Promise<void>;
  trackGoal(name: string, value?: number): Promise<void>;
  on(event: string, handler: (payload: unknown) => void): void;
  off(event: string, handler: (payload: unknown) => void): void;
  ready(): Promise<void>;
  isOpen(): boolean;
  getSessionToken(): string | null;
}

declare global {
  interface Window {
    FlowLyraConfig?: FlowLyraConfig;
    FlowLyra?: FlowLyraInstance;
    LiveChat?: FlowLyraInstance;
    FlowLyraQueue?: Array<[keyof FlowLyraInstance, unknown[]]>;
    LiveChatQueue?: Array<[keyof FlowLyraInstance, unknown[]]>;
  }
}
