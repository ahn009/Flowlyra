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
  is_internal: boolean;
  created_at: string;
}

export interface StartChatPayload {
  organization_id: string;
  session_token: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

declare global {
  interface Window {
    FlowLyraConfig?: FlowLyraConfig;
    FlowLyra?: { destroy: () => void };
  }
}
