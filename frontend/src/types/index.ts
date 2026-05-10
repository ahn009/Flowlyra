export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: "admin" | "supervisor" | "agent";
  status: string;
  is_online?: boolean;
}

export interface Chat {
  id: string;
  organization_id: string;
  contact_id?: string | null;
  assigned_user_id?: string | null;
  team_id?: string | null;
  status: "waiting" | "active" | "pending" | "resolved" | "closed";
  channel: string;
  subject?: string | null;
  visitor_name?: string | null;
  visitor_email?: string | null;
  visitor_ip?: string | null;
  visitor_current_url?: string | null;
  visitor_referrer?: string | null;
  visitor_page_views?: number | null;
  visitor_status?: "online" | "offline";
  last_message?: {
    content: string | null;
    sender_type: "customer" | "agent" | "system";
    created_at: string;
  } | null;
  tags: string[];
  updated_at: string;
  created_at: string;
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

export interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  description?: string | null;
  status: string;
  priority: string;
  assigned_user_id?: string | null;
  team_id?: string | null;
  tags?: string[];
  created_at?: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "urgent";
  createdAt: string;
}
