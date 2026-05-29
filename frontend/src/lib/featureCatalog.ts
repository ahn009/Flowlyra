export interface FeatureLink {
  title: string;
  description: string;
  href: string;
  category: "Conversations" | "Automation" | "AI" | "Reports" | "Widget" | "Team" | "Channels" | "Security" | "Developer" | "Billing";
  keywords: string[];
  permission?: string;
  status?: "Core" | "LiveChat parity" | "Admin" | "Enterprise";
}

export const FEATURE_LINKS: FeatureLink[] = [
  { title: "Workspace Home", description: "Start here for live metrics, setup checklist, product map, and recent activity.", href: "/home", category: "Conversations", status: "Core", keywords: ["home", "dashboard", "setup", "onboarding", "product map", "overview"] },
  { title: "Unified Inbox", description: "Handle live chats, queued visitors, assignments, sneak peek, transfers, notes, transcripts, and voice/video actions.", href: "/inbox", category: "Conversations", status: "Core", keywords: ["chat", "inbox", "live chat", "sneak peek", "message preview", "transfer", "assign", "transcript", "notes", "voice", "video", "screen share"] },
  { title: "Tickets / HelpDesk", description: "Manage async support, shared inbox tickets, internal notes, SLA workflows, followers, and collision presence.", href: "/tickets", category: "Conversations", status: "Core", keywords: ["ticket", "helpdesk", "shared inbox", "sla", "internal notes", "collision", "async"] },
  { title: "Contacts & Visitor Profiles", description: "View customer profiles, chat history, ecommerce context, custom variables, and visitor journey.", href: "/contacts", category: "Conversations", keywords: ["customer", "contact", "visitor", "profile", "history", "journey"] },
  { title: "Chat Archives", description: "Search and review resolved or closed conversations.", href: "/archives", category: "Conversations", keywords: ["archive", "closed chats", "history", "resolved"] },

  { title: "Widget Customization", description: "Configure widget colors, position, theme, branding, pre-chat form, surveys, attachments, inactivity messages, and languages.", href: "/admin/widget", category: "Widget", status: "LiveChat parity", permission: "widget.write", keywords: ["widget", "branding", "theme", "pre chat", "post chat", "survey", "attachments", "inactivity", "language", "custom css"] },
  { title: "Install Widget", description: "Copy embed code and installation snippets for websites and apps.", href: "/admin/install", category: "Widget", keywords: ["install", "embed", "script", "snippet", "website"] },
  { title: "Eye-catchers & Greetings", description: "Create proactive greetings, eye-catchers, and conversion prompts for website visitors.", href: "/admin/greetings-conversion", category: "Widget", keywords: ["eye catcher", "greeting", "booster", "conversion", "welcome"] },
  { title: "Voice, Video & Screen Share", description: "Configure in-chat calls, video support, co-browsing, and screen sharing availability.", href: "/settings/voice-video", category: "Widget", keywords: ["voice", "video", "screen", "webrtc", "cobrowse", "call"] },
  { title: "Moments / In-chat Apps", description: "Launch guided in-chat experiences and embedded customer actions.", href: "/admin/moments", category: "Widget", keywords: ["moments", "apps", "in chat apps", "guided", "embedded"] },

  { title: "Canned Responses", description: "Create reusable replies, shortcuts, shared templates, and response snippets.", href: "/admin/canned", category: "Automation", status: "LiveChat parity", permission: "canned.write", keywords: ["canned", "saved replies", "macros", "shortcuts", "templates"] },
  { title: "Chat Tags", description: "Manage tag library, labels, categorization, and reporting filters.", href: "/settings/tags", category: "Automation", permission: "tags.write", keywords: ["tag", "labels", "categorize", "topics", "filter"] },
  { title: "Routing Rules", description: "Auto-assign chats by team, skills, VIP status, load, round-robin, and chat limits.", href: "/admin/routing", category: "Automation", permission: "routing.write", keywords: ["routing", "assignment", "assign", "skills", "vip", "round robin", "chat limit", "max chats"] },
  { title: "Proactive Triggers & Campaigns", description: "Target visitors using URL, dwell time, idle time, cart value, returning visitor, and exit intent rules.", href: "/admin/triggers", category: "Automation", permission: "triggers.write", keywords: ["trigger", "campaign", "targeted message", "proactive", "idle", "exit intent", "cart rescue"] },
  { title: "Engage Campaigns", description: "Manage targeted messages, campaign conversion, and visitor engagement flows.", href: "/engage/campaigns", category: "Automation", keywords: ["engage", "campaign", "targeted", "conversion"] },
  { title: "Goals & Sales Tracker", description: "Track goals, sales attribution, campaign conversions, and achieved goals.", href: "/engage/goals", category: "Reports", keywords: ["goal", "sales tracker", "revenue", "conversion", "achieved goals"] },
  { title: "Website Traffic", description: "Monitor visitors, traffic, page views, current URL, referrers, and live visitor context.", href: "/engage/traffic", category: "Reports", keywords: ["traffic", "visitor tracking", "page views", "referrer", "website"] },

  { title: "AI Copilot", description: "Use AI reply suggestions, text enhancement, summaries, sentiment, tag suggestions, and knowledge search.", href: "/admin/ai-knowledge", category: "AI", status: "LiveChat parity", keywords: ["ai", "copilot", "suggestions", "summary", "sentiment", "text enhancement", "tag suggestions", "rag"] },
  { title: "Chatbot Builder", description: "Build automated conversation flows, bot handoff, and AI-powered answers.", href: "/admin/chatbot", category: "AI", keywords: ["chatbot", "bot", "automation", "flow", "handoff"] },
  { title: "Knowledge Base", description: "Create articles, categories, public help center content, search, revisions, and analytics.", href: "/admin/kb", category: "AI", permission: "kb.write", keywords: ["knowledge", "kb", "articles", "help center", "self service", "search"] },

  { title: "Reports Dashboard", description: "View chat volume, CSAT, response times, agent stats, exports, and scheduled reports.", href: "/admin/analytics", category: "Reports", status: "Core", permission: "reports.read", keywords: ["reports", "analytics", "dashboard", "csat", "response time", "export", "scheduled reports"] },
  { title: "Benchmarks", description: "Compare support metrics against local benchmark and performance targets.", href: "/admin/benchmark", category: "Reports", keywords: ["benchmark", "local benchmark", "performance"] },
  { title: "Availability Reports", description: "Review agent availability, staffing coverage, and chat availability trends.", href: "/admin/availability", category: "Reports", keywords: ["availability", "staffing", "schedule", "work scheduler", "online"] },

  { title: "Agents", description: "Invite agents, manage roles, online status, skills, max chats, and account access.", href: "/admin/agents", category: "Team", permission: "agents.read", keywords: ["agents", "users", "invite", "roles", "skills", "max chats", "chat limit"] },
  { title: "Teams / Departments", description: "Create departments, groups, routing teams, and team membership.", href: "/admin/teams", category: "Team", permission: "teams.read", keywords: ["teams", "departments", "groups", "members"] },
  { title: "Notification Preferences", description: "Configure desktop, sound, email digest, push, and mobile notifications.", href: "/settings/notifications", category: "Team", keywords: ["notifications", "push", "sound", "email digest", "alerts"] },

  { title: "Channels", description: "Connect WhatsApp, SMS, email, Messenger, Telegram, and other customer channels.", href: "/admin/channels", category: "Channels", keywords: ["channels", "whatsapp", "sms", "email", "messenger", "telegram", "omnichannel"] },
  { title: "Integrations Marketplace", description: "Install CRM, ecommerce, marketing, OAuth, Slack, Zapier-style, and third-party integrations.", href: "/settings/integrations", category: "Channels", permission: "integrations.read", keywords: ["integrations", "marketplace", "crm", "shopify", "salesforce", "hubspot", "slack", "zapier"] },

  { title: "Security Center", description: "Manage 2FA, SSO, SCIM, IP allowlist, retention, visitor bans, sessions, and security events.", href: "/settings/security", category: "Security", status: "Enterprise", keywords: ["security", "2fa", "sso", "scim", "ip allowlist", "retention", "visitor ban", "sessions"] },
  { title: "Audit Logs", description: "Review workspace actions, admin changes, and compliance history.", href: "/settings/audit", category: "Security", permission: "audit.read", keywords: ["audit", "logs", "compliance", "history"] },
  { title: "API Keys", description: "Create scoped API keys for platform APIs, customer SDKs, and server integrations.", href: "/settings/api", category: "Developer", permission: "api_keys.write", keywords: ["api", "api keys", "sdk", "developer", "rest"] },
  { title: "Webhooks", description: "Send real-time chat, contact, ticket, and integration events to external systems.", href: "/settings/webhooks", category: "Developer", permission: "webhooks.write", keywords: ["webhooks", "events", "developer", "callback"] },
  { title: "Billing & Plans", description: "Manage plan, seats, limits, invoices, and pricing tier settings.", href: "/admin/billing", category: "Billing", permission: "billing.read", keywords: ["billing", "plans", "seats", "pricing", "limits", "invoice"] },
];

export function searchFeatures(query: string): FeatureLink[] {
  const q = query.trim().toLowerCase();
  if (!q) return FEATURE_LINKS;
  return FEATURE_LINKS
    .map((feature) => {
      const haystack = [feature.title, feature.description, feature.category, ...(feature.keywords || [])].join(" ").toLowerCase();
      const score = feature.title.toLowerCase().includes(q) ? 3 : feature.keywords.some((k) => k.toLowerCase().includes(q)) ? 2 : haystack.includes(q) ? 1 : 0;
      return { feature, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.feature.title.localeCompare(b.feature.title))
    .map((item) => item.feature);
}
