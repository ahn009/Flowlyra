export type WidgetState = "HIDDEN" | "BUBBLE" | "PRECHAT" | "CHATTING" | "WAITING" | "CSAT" | "OFFLINE";

export interface FlowLyraConfig {
  orgSlug: string;
  apiUrl?: string;
}

export interface WidgetInitResponse {
  organization_id: string;
  session_token: string;
  existing_chat_id: string | null;
  is_online: boolean;
  widget_config: {
    color: string;
    greeting: string;
    logo_url: string | null;
    position: string;
    theme: "light" | "dark" | "auto" | string;
    pre_chat_form: {
      enabled?: boolean;
      fields?: string[];
    };
    post_chat_survey: {
      enabled?: boolean;
      type?: string;
    };
    custom_css: string | null;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_type: "customer" | "agent" | "system";
  content: string | null;
  content_type: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_mime?: string | null;
  is_internal: boolean;
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

declare global {
  interface Window {
    FlowLyraConfig?: FlowLyraConfig;
    FlowLyra?: { destroy: () => void };
  }
}
