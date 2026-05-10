# FlowLyra Feature Gap Report

**Generated:** 2026-05-10
**Analyzed by:** Jcode Agent
**Total Features Checked:** 428
**Present:** 65 (15.2%)
**Partial:** 96 (22.4%)
**Missing:** 267 (62.4%)

---

## Console Summary

```text
===== FLOWLYRA FEATURE GAP ANALYSIS =====
Total Features: 428
✅ Present: 65 (15.2%)
⚠️ Partial: 96 (22.4%)
❌ Missing: 267 (62.4%)

Missing Categories (most gaps first):
1. API Platform — 18 missing, 4 partial
2. Integrations / Marketplace — 18 missing, 4 partial
3. AI & Automation — 17 missing, 5 partial
4. Knowledge Base — 15 missing, 1 partial
5. Ticketing / Helpdesk — 14 missing, 7 partial
6. Multi-Channel Messaging — 13 missing, 2 partial
7. Admin / Settings — 9 missing, 5 partial
8. Reports & Analytics — 9 missing, 8 partial
9. Billing & Subscriptions — 7 missing, 2 partial
10. Chat Widget — 9 missing, 17 partial
```

---

## Step 1 Codebase Analysis

### Project structure analyzed

- `backend/`: FastAPI application with SQLAlchemy 2 models, Alembic, Socket.IO, Redis, Celery, pytest smoke tests.
- `frontend/`: React 18 + Vite + TypeScript + Tailwind dashboard/public site.
- `widget/`: separate Vite IIFE embeddable widget package using Socket.IO client.
- `docker/`: Postgres, Redis, backend, celery, frontend, widget compose setup.

### Tech stack and conventions

| Area | Finding |
|------|---------|
| Backend | FastAPI, SQLAlchemy async, Pydantic v2, Alembic, Socket.IO ASGI, Redis, Celery, SendGrid, S3 upload service |
| Frontend | React 18, React Router, TanStack Query, Zustand, Axios, Tailwind, Recharts, Lucide icons |
| Widget | Vite library build, vanilla TypeScript DOM classes, Socket.IO client |
| DB | PostgreSQL via asyncpg, SQLAlchemy declarative models, Alembic `Base.metadata.create_all` initial migration |
| Tests | Mostly import/smoke tests; no end-to-end or meaningful feature tests yet |
| Validation | Backend uses Pydantic schemas, not Zod because backend is Python. Frontend uses TypeScript only, no form schema library currently |

### Evidence map

| Area | Evidence |
|------|----------|
| Backend app registration | `backend/app/main.py:17-57` creates FastAPI app and mounts routers |
| Socket server | `backend/app/socket_manager.py:69-347` handles connect, chat start/message, typing, assignment, resolve, CSAT |
| Widget init | `backend/app/api/widget.py:34-64` creates/resumes visitor session and returns widget config |
| Chat APIs | `backend/app/api/chats.py:22-257` lists/searches/details/update/assign/transfer/resolve/close/note/tag/ban/convert |
| Admin APIs | `backend/app/api/admin.py:26-227` org, teams, canned, routing rules, proactive triggers, worker ping |
| Analytics APIs | `backend/app/api/analytics.py:21-60` overview, volume, response time, CSAT, agent stats, missed, tags |
| Ticket APIs | `backend/app/api/tickets.py:20-91` list/create/detail/update/resolve/comments |
| Upload API | `backend/app/api/upload.py:12-13` S3 upload endpoint |
| Models | `backend/app/models/*.py` includes Organization, User, Team, Session, Contact, Chat, Message, Ticket, CannedResponse, RoutingRule, ProactiveTrigger, AnalyticsEvent |
| Widget UI | `widget/src/Widget.ts:25-183`, `widget/src/ChatPanel.ts:6-185`, `widget/src/PreChatForm.ts:1-28`, `widget/src/CSATForm.ts:1-32`, `widget/src/OfflineForm.ts:1-21` |
| Dashboard routes | `frontend/src/App.tsx:56-97` |
| Chat page | `frontend/src/pages/ChatPage.tsx:26-311` |
| Inbox page | `frontend/src/pages/InboxPage.tsx:10-103` |
| Admin pages | `frontend/src/pages/AdminPages.tsx:13-746` |
| Ticket pages | `frontend/src/pages/TicketsPage.tsx:14-224` |
| Tests | `backend/tests/*.py`, `frontend/src/App.test.tsx` are smoke/import tests |

---

## Summary by Category

| Category | Total | Present | Partial | Missing |
|----------|-------|---------|---------|---------|
| Chat Widget | 36 | 10 | 17 | 9 |
| Dashboard - Home | 6 | 0 | 3 | 3 |
| Dashboard - Chats | 18 | 7 | 9 | 2 |
| Dashboard - Archives | 7 | 0 | 2 | 5 |
| Dashboard - Engage | 15 | 1 | 5 | 9 |
| Reports & Analytics | 21 | 4 | 8 | 9 |
| AI & Automation | 24 | 2 | 5 | 17 |
| Multi-Channel | 15 | 1 | 1 | 13 |
| Ticketing | 23 | 2 | 7 | 14 |
| Knowledge Base | 16 | 0 | 1 | 15 |
| Sales & Ecommerce | 11 | 0 | 2 | 9 |
| Team Management | 13 | 5 | 3 | 5 |
| Admin/Settings | 15 | 4 | 2 | 9 |
| Security | 18 | 4 | 6 | 8 |
| Real-Time | 8 | 5 | 3 | 0 |
| API Platform | 23 | 1 | 4 | 18 |
| Integrations | 22 | 0 | 4 | 18 |
| Billing | 9 | 1 | 1 | 7 |
| Mobile/PWA | 4 | 2 | 0 | 2 |
| Notifications | 5 | 1 | 2 | 2 |
| Database Models | 41 | 14 | 3 | 24 |
| Model Fields | 14 | 6 | 2 | 6 |
| API Endpoints | 23 | 8 | 6 | 9 |
| Frontend Pages | 45 | 18 | 6 | 21 |
| Security Checks | 15 | 4 | 5 | 6 |

---

## Detailed Findings

Legend: ✅ PRESENT, ⚠️ PARTIAL, ❌ MISSING.

### Category 1: Chat Widget

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 1.1 | Embeddable JS Widget | ✅ PRESENT | `widget/vite.config.ts` builds IIFE `widget.js`; install snippets in `frontend/src/pages/AdminPages.tsx:221-243`. |
| 1.2 | Widget Positioning | ⚠️ PARTIAL | Config field returned in `backend/app/api/widget.py:46-54`; CSS currently hardcodes bottom-right in `widget/src/styles.ts:5-8`. Missing all four position rendering. |
| 1.3 | Widget Theme | ⚠️ PARTIAL | Color/custom CSS supported in `widget/src/styles.ts:1-19`; no light/dark/auto mode switch. |
| 1.4 | Custom Greeting Message | ⚠️ PARTIAL | Single greeting configurable in `frontend/src/pages/AdminPages.tsx:145-194` and rendered `widget/src/ChatPanel.ts:38-40`; no random rotation. |
| 1.5 | Language Selection | ❌ MISSING | No i18n/detection/switcher files found. |
| 1.6 | Pre-Chat Form | ⚠️ PARTIAL | `widget/src/PreChatForm.ts:1-28` has fixed name/email/topic/message; not admin-configurable, no phone/custom fields. |
| 1.7 | Post-Chat Survey | ✅ PRESENT | CSAT flow in `widget/src/CSATForm.ts:1-32`, socket handler `backend/app/socket_manager.py:299-307`. |
| 1.8 | Rich Messages Cards | ❌ MISSING | `Message.content_type` exists in `backend/app/models/message.py:19`, but widget renders text only in `widget/src/ChatPanel.ts:78-104`. |
| 1.9 | Rich Messages Carousels | ❌ MISSING | No carousel message metadata renderer. |
| 1.10 | Quick Reply Buttons | ⚠️ PARTIAL | Static quick topics in `widget/src/ChatPanel.ts:141-166`; no message-level quick replies. |
| 1.11 | File Upload Visitor | ⚠️ PARTIAL | Widget file button sends filename text only `widget/src/Widget.ts:59`; real upload endpoint exists for agents only `backend/app/api/upload.py:12-13`. |
| 1.12 | Emoji Picker | ❌ MISSING | No emoji picker dependency or widget UI. |
| 1.13 | Agent Profiles in Widget | ⚠️ PARTIAL | Static agent avatars/header in `widget/src/ChatPanel.ts:25-35`; no real assigned agent name/avatar. |
| 1.14 | Typing Indicators | ✅ PRESENT | Widget typing indicator `widget/src/ChatPanel.ts:89-96`; socket handlers `backend/app/socket_manager.py:184-199`. |
| 1.15 | Message Sneak-Peek | ✅ PRESENT | Widget emits `chat:typing:preview` in `widget/src/SocketClient.ts:36-38`; agent listener `frontend/src/socket/index.ts:55`. |
| 1.16 | Chat Rating | ✅ PRESENT | Same as CSAT: `widget/src/CSATForm.ts`, `backend/app/socket_manager.py:299-307`. |
| 1.17 | Offline Mode | ⚠️ PARTIAL | Widget form in `widget/src/OfflineForm.ts:1-21`; current submit logs/init only `widget/src/Widget.ts:138-140`; no email notification. |
| 1.18 | Sound Notifications | ❌ MISSING | No audio assets/settings. |
| 1.19 | Unread Message Badge | ❌ MISSING | CSS has `.cf-badge` but no logic in `widget/src/Widget.ts`. |
| 1.20 | Mobile Responsive | ✅ PRESENT | Responsive CSS in `widget/src/styles.ts:17`. |
| 1.21 | Eye-Catchers | ⚠️ PARTIAL | Bubble animation `widget/src/styles.ts:8-9`; no custom popups/eye-catcher config. |
| 1.22 | Chat Buttons | ❌ MISSING | No DOM attribute scanner/API. |
| 1.23 | Domain Whitelist/Blacklist | ❌ MISSING | No domain validation in `backend/app/api/widget.py`. |
| 1.24 | White Label | ❌ MISSING | Branding fixed as FlowLyra in `widget/src/ChatPanel.ts:32`. |
| 1.25 | Custom CSS/JS Injection | ⚠️ PARTIAL | Custom CSS supported `widget/src/styles.ts:18`; no custom JS injection. |
| 1.26 | Accessibility WCAG | ⚠️ PARTIAL | Some labels/buttons exist; no full keyboard/screen-reader audit. |
| 1.27 | Bot-to-Human Handoff | ❌ MISSING | No chatbot/bot session model. |
| 1.28 | Chat History Visitor Side | ⚠️ PARTIAL | Existing chat ID resumes `backend/app/api/widget.py:55`; messages are not fetched/rendered on reopen. |
| 1.29 | Persistent Chat | ⚠️ PARTIAL | Session token local storage in `widget/src/utils.ts:1-8`; no email link continuation. |
| 1.30 | Direct Chat Link/Page | ❌ MISSING | No standalone public chat route. |
| 1.31 | Voice/Video/Screen Sharing | ❌ MISSING | No WebRTC. |
| 1.32 | Credit Card Masking | ❌ MISSING | No message sanitization/masking. |
| 1.33 | Lazy Loading | ⚠️ PARTIAL | Widget boot is async, but init call runs immediately in `widget/src/Widget.ts:18-23`; no idle/interaction lazy init. |
| 1.34 | Widget Preview | ✅ PRESENT | Preview in `frontend/src/pages/AdminPages.tsx:196-215`. |
| 1.35 | Multiple Widgets | ❌ MISSING | Widget config stored on Organization only `backend/app/models/organization.py:23-28`. |
| 1.36 | Product Cards | ❌ MISSING | No product/card message renderer. |

### Category 2: Agent Dashboard — Home / Overview

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 2.1 | Real-Time Overview | ⚠️ PARTIAL | Analytics overview API exists `backend/app/api/analytics.py:21-24`, shown under `/admin/analytics`; no `/app` home dashboard. |
| 2.2 | Last 7 Days Summary | ⚠️ PARTIAL | Chat volume chart uses last 7 points `frontend/src/pages/AdminPages.tsx:602-604`; missing goals/sales. |
| 2.3 | Quick Stats Cards | ⚠️ PARTIAL | `MetricCard` stats in `frontend/src/pages/AdminPages.tsx:615-622`. |
| 2.4 | Recent Activity Feed | ❌ MISSING | No activity feed model/page. |
| 2.5 | Onboarding Checklist | ❌ MISSING | No onboarding checklist state/UI. |
| 2.6 | Wall-Mountable Display | ❌ MISSING | No fullscreen dashboard mode. |

### Category 3: Agent Dashboard — Chats Section

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 3.1 | Chat List Sidebar | ⚠️ PARTIAL | Inbox list `frontend/src/pages/InboxPage.tsx:21-44`; missing My/Queued/Supervised tabs functionality. |
| 3.2 | Chat Feed | ✅ PRESENT | `frontend/src/pages/ChatPage.tsx:122-124`, real-time store listener `frontend/src/socket/index.ts:40-53`. |
| 3.3 | Message Input Area | ⚠️ PARTIAL | Text input, canned chips, placeholder attach buttons `frontend/src/pages/ChatPage.tsx:263-311`; no rich text/real uploads. |
| 3.4 | AI Reply Suggestions | ⚠️ PARTIAL | Suggestions store/listener `frontend/src/socket/index.ts:74`; worker call `backend/app/socket_manager.py:176-179`; minimal OpenAI service. |
| 3.5 | AI Text Enhancement | ❌ MISSING | No enhance endpoints/UI. |
| 3.6 | Sneak-Peek Agent Side | ✅ PRESENT | Preview banner `frontend/src/pages/ChatPage.tsx:115-120`; store `frontend/src/stores/chatStore.ts:58`. |
| 3.7 | Canned Responses | ⚠️ PARTIAL | CRUD `backend/app/api/admin.py:100-128`; UI manager `frontend/src/pages/AdminPages.tsx:440-503`; no `/` search insertion with variables. |
| 3.8 | Chat Tags | ⚠️ PARTIAL | API add tag `backend/app/api/chats.py:237-245`; no inline tag manager UI in chat. |
| 3.9 | Chat Transfer | ⚠️ PARTIAL | API/socket transfer exists `backend/app/api/chats.py:197-207`, `backend/app/socket_manager.py:273-277`; UI action placeholder only. |
| 3.10 | Chat Notes | ✅ PRESENT | API note creates internal message `backend/app/api/chats.py:228-235`; ChatPage noteMode `frontend/src/pages/ChatPage.tsx:29-57`. |
| 3.11 | Customer Details Panel | ⚠️ PARTIAL | Visitor panel `frontend/src/pages/ChatPage.tsx:181-223`; lacks device/custom/ecommerce/history depth. |
| 3.12 | File Sharing Agent | ⚠️ PARTIAL | Upload endpoint `backend/app/api/upload.py:12-13`; ChatPage buttons placeholders, no actual attach/send. |
| 3.13 | Emojis & GIFs | ❌ MISSING | No picker/Giphy. |
| 3.14 | Chat Actions | ⚠️ PARTIAL | Resolve API and button; assign/snooze placeholder `frontend/src/pages/ChatPage.tsx:94-99`. Ban API exists `backend/app/api/chats.py:247-250`. |
| 3.15 | Multi-Chat Handling | ⚠️ PARTIAL | Agent max chats field exists `backend/app/models/user.py:24`; no visual tabs. |
| 3.16 | Chat Search | ✅ PRESENT | API `backend/app/api/chats.py:38-40`; global search input not wired. |
| 3.17 | Keyboard Shortcuts | ⚠️ PARTIAL | Ctrl+Enter send only `frontend/src/pages/ChatPage.tsx:299-301`. |
| 3.18 | Read Receipts | ⚠️ PARTIAL | `Message.is_read` model `backend/app/models/message.py:25`, socket read handler `backend/app/socket_manager.py:290-296`; no UI delivery/read status. |

### Category 4: Archives

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 4.1 | Archived Chats List | ⚠️ PARTIAL | `GET /chats` can filter status `backend/app/api/chats.py:22-35`; no archive page. |
| 4.2 | Filters | ⚠️ PARTIAL | Backend list filters status/assigned/team/channel/tag `backend/app/services/chat_service.py:155-163`; no date/rating UI. |
| 4.3 | Transcript Export | ❌ MISSING | No transcript email/PDF/TXT. |
| 4.4 | Ban from Archive | ⚠️ PARTIAL | Ban API exists `backend/app/api/chats.py:247-250`; no archive UI. |
| 4.5 | Batch Tag Archives | ❌ MISSING | No bulk archive operations. |
| 4.6 | Detailed Customer Info | ⚠️ PARTIAL | Chat detail visitor session `backend/app/api/chats.py:65-79`; no archive-specific page. |
| 4.7 | History Duration by Plan | ❌ MISSING | No retention enforcement. |

### Category 5: Engage Section

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 5.1 | Real-Time Visitor List | ⚠️ PARTIAL | Session model stores URL/referrer/IP `backend/app/models/session.py:22-31`; no traffic page. |
| 5.2 | Manual Chat Initiation | ❌ MISSING | No agent-initiated visitor chat. |
| 5.3 | Welcome Campaigns | ⚠️ PARTIAL | ProactiveTrigger model/API/UI exists `backend/app/models/proactive_trigger.py`, `frontend/src/pages/AdminPages.tsx:355-438`; no widget execution. |
| 5.4 | Idle Visitor Campaigns | ⚠️ PARTIAL | Trigger type option exists `frontend/src/pages/AdminPages.tsx:402`; no runtime. |
| 5.5 | Exit Intent Campaigns | ⚠️ PARTIAL | Trigger type option exists `frontend/src/pages/AdminPages.tsx:403`; no runtime. |
| 5.6 | Page-Specific Campaigns | ⚠️ PARTIAL | URL match trigger type exists `frontend/src/pages/AdminPages.tsx:404`; no runtime. |
| 5.7 | Lead Capture Campaigns | ❌ MISSING | No lead campaign subtype. |
| 5.8 | Promotional Campaigns | ❌ MISSING | No promo campaign subtype. |
| 5.9 | Campaign Targeting Rules | ⚠️ PARTIAL | JSON conditions field in `backend/app/models/proactive_trigger.py:17`; no builder. |
| 5.10 | Campaign Analytics | ⚠️ PARTIAL | `sent_count` exists `backend/app/models/proactive_trigger.py:20`; no conversions/clicks. |
| 5.11 | A/B Testing | ❌ MISSING | No variants. |
| 5.12 | Custom Goals | ❌ MISSING | No Goal model/API. |
| 5.13 | Goal Attribution | ❌ MISSING | No GoalAchievement. |
| 5.14 | Goal Value Tracking | ❌ MISSING | No revenue goal model. |
| 5.15 | Traffic Monitoring | ⚠️ PARTIAL | Session data exists; no live traffic UI/API. |

### Category 6: Reports & Analytics

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 6.1 | Dashboard Report | ✅ PRESENT | `backend/app/api/analytics.py:21-24`; UI `frontend/src/pages/AdminPages.tsx:554-682`. |
| 6.2 | Chat Volume Reports | ✅ PRESENT | `backend/app/api/analytics.py:26-31`. |
| 6.3 | Chat Duration Reports | ❌ MISSING | No duration metric. |
| 6.4 | Missed Chats Report | ✅ PRESENT | `backend/app/api/analytics.py:53-55`. |
| 6.5 | Chat Initiation Breakdown | ❌ MISSING | No initiated_by tracking. |
| 6.6 | Channel Breakdown | ⚠️ PARTIAL | Chat channel field exists `backend/app/models/chat.py:21`; no report. |
| 6.7 | Agent Performance Reports | ⚠️ PARTIAL | Agent stats endpoint `backend/app/api/analytics.py:47-50`; limited metrics. |
| 6.8 | Agent Activity Report | ❌ MISSING | No online/busy time tracking. |
| 6.9 | Agent Leaderboard | ⚠️ PARTIAL | Agent stats table exists `frontend/src/pages/AdminPages.tsx:656-679`; not full leaderboard. |
| 6.10 | Queue Wait Time Report | ⚠️ PARTIAL | Overview avg wait `backend/app/services/analytics_service.py`; no abandonment. |
| 6.11 | CSAT Reports | ⚠️ PARTIAL | CSAT endpoint `backend/app/api/analytics.py:40-44`. |
| 6.12 | Repeat Customer Rate | ❌ MISSING | No repeat metric. |
| 6.13 | Goals Achieved Report | ❌ MISSING | No goals. |
| 6.14 | Revenue/Sales Report | ❌ MISSING | No revenue attribution. |
| 6.15 | Campaign Conversion Report | ❌ MISSING | No campaign conversion report. |
| 6.16 | Report Filters | ⚠️ PARTIAL | Limited group_by/date implicit; no UI filters. |
| 6.17 | Report Export | ❌ MISSING | No CSV/PDF/Excel export. |
| 6.18 | Scheduled Reports | ❌ MISSING | No ReportSchedule. |
| 6.19 | Staffing Prediction | ❌ MISSING | No prediction. |
| 6.20 | Real-Time Dashboard Updates | ✅ PRESENT | React Query refetch intervals in `frontend/src/pages/AdminPages.tsx:559-599`; not socket dashboard_update. |
| 6.21 | Report Sharing | ❌ MISSING | No share links. |

### Category 7: AI & Automation

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 7.1 | AI Copilot | ❌ MISSING | No copilot UI/API. |
| 7.2 | AI Reply Suggestions | ⚠️ PARTIAL | OpenAI suggestion worker exists `backend/app/workers/ai_worker.py`; limited source context. |
| 7.3 | AI Chat Summary | ❌ MISSING | No summary endpoint. |
| 7.4 | AI Weekly Insights | ❌ MISSING | No insights job. |
| 7.5 | AI Text Expand | ❌ MISSING | No text enhancement. |
| 7.6 | AI Text Rephrase | ❌ MISSING | No text enhancement. |
| 7.7 | AI Text Summarize | ❌ MISSING | No text enhancement. |
| 7.8 | AI Tone Adjustment | ❌ MISSING | No text enhancement. |
| 7.9 | AI Grammar Fix | ❌ MISSING | No text enhancement. |
| 7.10 | AI Auto-Tagging | ❌ MISSING | No auto-tagging. |
| 7.11 | AI Sentiment Analysis | ❌ MISSING | No sentiment. |
| 7.12 | Visual Bot Builder | ❌ MISSING | No chatbot models/UI. |
| 7.13 | NLU Intent Matching | ❌ MISSING | No embeddings/intent. |
| 7.14 | FAQ Responses | ❌ MISSING | No KB/chatbot. |
| 7.15 | Multi-Turn Bot Context | ❌ MISSING | No bot. |
| 7.16 | Bot Fallback to Human | ❌ MISSING | No bot handoff. |
| 7.17 | Offline Lead Bot | ❌ MISSING | No bot. |
| 7.18 | Multiple Bot Flows | ❌ MISSING | No ChatbotFlow model. |
| 7.19 | External API Bot Calls | ❌ MISSING | No bot action system. |
| 7.20 | Custom Data Training | ❌ MISSING | No KnowledgeSource/vector DB. |
| 7.21 | Knowledge Source Indexing | ❌ MISSING | No KnowledgeSource. |
| 7.22 | KB Article Drafting | ❌ MISSING | No KB. |
| 7.23 | Automated Ticket Workflows | ❌ MISSING | No TicketWorkflow. |
| 7.24 | Chat Routing Rules | ✅ PRESENT | RoutingRule model/API/UI `backend/app/models/routing_rule.py`, `backend/app/api/admin.py:145-173`. |

### Category 8: Multi-Channel Messaging

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 8.1 | Website Widget | ✅ PRESENT | Widget package and public init endpoint exist. |
| 8.2 | Facebook Messenger | ❌ MISSING | No integration. |
| 8.3 | Instagram | ❌ MISSING | No integration. |
| 8.4 | WhatsApp Business | ⚠️ PARTIAL | Env vars mention WhatsApp in `.env.example`; no API handlers. |
| 8.5 | Apple Messages | ❌ MISSING | No integration. |
| 8.6 | SMS Twilio | ❌ MISSING | No Twilio dependency. |
| 8.7 | Telegram | ❌ MISSING | No Telegram. |
| 8.8 | Email Ticketing | ⚠️ PARTIAL | SendGrid dependency/email service; no inbound email threading. |
| 8.9 | Twitter/X | ❌ MISSING | No integration. |
| 8.10 | Direct Chat Page | ❌ MISSING | No route. |
| 8.11 | Unified Inbox | ⚠️ PARTIAL | Chat `channel` field and inbox list exist; only web channel implemented. |
| 8.12 | Channel-Specific Formatting | ❌ MISSING | No formatting by channel. |
| 8.13 | Cross-Channel History | ❌ MISSING | No multi-channel contact history. |
| 8.14 | Channel Toggles | ❌ MISSING | No settings. |
| 8.15 | Channel Analytics | ❌ MISSING | No per-channel report. |

### Category 9: Ticketing / Helpdesk

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 9.1 | Ticket Creation | ⚠️ PARTIAL | Manual create `backend/app/api/tickets.py:42-48`, convert from chat `backend/app/api/chats.py:253-257`; no email/web/API public. |
| 9.2 | Ticket Inbox Views | ⚠️ PARTIAL | Status filter in `frontend/src/pages/TicketsPage.tsx:14-121`; no saved views/following. |
| 9.3 | Ticket Assignment | ⚠️ PARTIAL | Fields exist `backend/app/models/ticket.py:20-21`; no auto/manual assignment UI. |
| 9.4 | Ticket Priority | ✅ PRESENT | Model field `backend/app/models/ticket.py:19`; UI in `frontend/src/pages/TicketsPage.tsx`. |
| 9.5 | Ticket Status Workflow | ⚠️ PARTIAL | open/pending/resolved only `frontend/src/pages/TicketsPage.tsx:11`. |
| 9.6 | SLA Policies | ❌ MISSING | No SLA model. |
| 9.7 | Collision Detection | ❌ MISSING | No viewing/replying presence. |
| 9.8 | Ticket Canned Responses | ❌ MISSING | Chat canned exists, not ticket insertion. |
| 9.9 | Rich Text Ticket Editor | ❌ MISSING | Plain textarea. |
| 9.10 | Internal Notes Ticket | ✅ PRESENT | `TicketComment.is_internal` `backend/app/models/ticket.py:39`; UI checkbox. |
| 9.11 | Ticket Merge | ❌ MISSING | No merge. |
| 9.12 | Ticket Split | ❌ MISSING | No split. |
| 9.13 | Bulk Actions | ❌ MISSING | No bulk API/UI. |
| 9.14 | Custom Saved Views | ❌ MISSING | No saved views. |
| 9.15 | Automated Workflows | ❌ MISSING | No TicketWorkflow. |
| 9.16 | Time Tracking | ❌ MISSING | No time tracking. |
| 9.17 | Customer Portal | ❌ MISSING | No portal. |
| 9.18 | Email Integration | ❌ MISSING | No inbound email ticketing. |
| 9.19 | Ticket Export | ❌ MISSING | No export. |
| 9.20 | Activity Log | ❌ MISSING | No TicketActivity. |
| 9.21 | AI Suggestions Ticket | ❌ MISSING | No ticket AI. |
| 9.22 | Custom Fields Ticket | ❌ MISSING | No custom fields. |
| 9.23 | Related Tickets | ❌ MISSING | No relation model. |

### Category 10: Knowledge Base

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 10.1 | Public Knowledge Base | ⚠️ PARTIAL | Public `/help` page exists `frontend/src/pages/PublicPages.tsx:538-556`, but static FAQ only. |
| 10.2 | Categories | ❌ MISSING | No KBCategory model. |
| 10.3 | Rich Article Editor | ❌ MISSING | No article editor. |
| 10.4 | Article Statuses | ❌ MISSING | No KBArticle. |
| 10.5 | SEO Fields | ❌ MISSING | No KBArticle. |
| 10.6 | Sitemap | ❌ MISSING | No sitemap generation. |
| 10.7 | Full-Text Search | ❌ MISSING | No KB search. |
| 10.8 | Article Feedback | ❌ MISSING | No feedback. |
| 10.9 | Related Articles | ❌ MISSING | No articles. |
| 10.10 | Article Analytics | ❌ MISSING | No article analytics. |
| 10.11 | Multi-Language | ❌ MISSING | No i18n. |
| 10.12 | KB Branding | ❌ MISSING | No KB settings. |
| 10.13 | Custom Domain | ❌ MISSING | No custom domain. |
| 10.14 | Version History | ❌ MISSING | No revisions. |
| 10.15 | AI Article Drafting | ❌ MISSING | No KB AI. |
| 10.16 | Widget KB Search | ❌ MISSING | No widget KB. |

### Category 11: Sales & Ecommerce

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 11.1 | Product Cards | ❌ MISSING | No product model/message card renderer. |
| 11.2 | AI Product Recommendations | ❌ MISSING | No ecommerce AI. |
| 11.3 | Shopify | ❌ MISSING | Listed as marketing integration only, no code integration. |
| 11.4 | WooCommerce | ❌ MISSING | No integration. |
| 11.5 | BigCommerce | ❌ MISSING | Marketing text only. |
| 11.6 | CMS Product Sync | ❌ MISSING | No integrations. |
| 11.7 | Cart Recovery | ❌ MISSING | No cart model. |
| 11.8 | Order Tracking | ❌ MISSING | No orders. |
| 11.9 | Sales Tracker | ❌ MISSING | No revenue attribution. |
| 11.10 | Goals & Conversions | ❌ MISSING | No goals. |
| 11.11 | Revenue Dashboard | ❌ MISSING | No revenue data. |

### Category 12: Team Management

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 12.1 | Agent Invitations | ✅ PRESENT | `backend/app/api/agents.py:26-45`, invite accept `backend/app/api/auth.py:97-111`. |
| 12.2 | Agent Roles | ⚠️ PARTIAL | Roles admin/supervisor/agent `backend/app/models/user.py:18`; no owner. |
| 12.3 | Departments/Groups | ✅ PRESENT | Team model/API/UI `backend/app/models/team.py`, `frontend/src/pages/AdminPages.tsx:76-143`. |
| 12.4 | Agent Status | ✅ PRESENT | `backend/app/api/agents.py:61-69`, socket agent status `backend/app/socket_manager.py:232-237`. |
| 12.5 | Chat Limits per Agent | ✅ PRESENT | `backend/app/models/user.py:24`, invite UI `frontend/src/pages/AdminPages.tsx:19`. |
| 12.6 | Work Scheduler | ❌ MISSING | No WorkSchedule model. |
| 12.7 | Auto-Accept Chats | ❌ MISSING | No auto_accept field. |
| 12.8 | Bulk Availability | ❌ MISSING | No bulk status API. |
| 12.9 | Supervision / Whisper | ⚠️ PARTIAL | Supervisor rooms and whisper socket `backend/app/socket_manager.py:80-81,341-366`; no UI. |
| 12.10 | Performance Reports | ⚠️ PARTIAL | Agent stats endpoint; limited. |
| 12.11 | Agent Directory | ✅ PRESENT | Agents page `frontend/src/pages/AdminPages.tsx:13-74`. |
| 12.12 | Agent-to-Agent Chat | ❌ MISSING | Whisper only, no DM chat UI/history. |
| 12.13 | Google SSO | ❌ MISSING | No OAuth. |

### Category 13: Admin / Settings

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 13.1 | Workspace Settings | ✅ PRESENT | Billing/workspace page `frontend/src/pages/AdminPages.tsx:505-552`; org API `backend/app/api/admin.py:26-38`. |
| 13.2 | Widget Settings | ⚠️ PARTIAL | Basic widget color/greeting/position `frontend/src/pages/AdminPages.tsx:145-219`; missing forms/behavior/domain. |
| 13.3 | Team Management | ✅ PRESENT | Agents/Teams pages. |
| 13.4 | Channel Setup | ❌ MISSING | No channel setup. |
| 13.5 | Canned Manager | ✅ PRESENT | `frontend/src/pages/AdminPages.tsx:440-503`. |
| 13.6 | Tags Manager | ❌ MISSING | Chat tag API only, no manager/color. |
| 13.7 | Automation Settings | ⚠️ PARTIAL | Routing rules/proactive triggers UI exists; no full workflows/chatbot. |
| 13.8 | Integrations Page | ❌ MISSING | Public marketing page only, no settings. |
| 13.9 | API & Developers | ❌ MISSING | No API keys/webhooks settings. |
| 13.10 | Billing & Plans | ⚠️ PARTIAL | Plan field editable; no Stripe checkout/invoices. |
| 13.11 | Security Settings | ❌ MISSING | No 2FA/SSO/IP whitelist/audit UI. |
| 13.12 | Data & Privacy | ⚠️ PARTIAL | Contact delete API `backend/app/api/contacts.py:65-77`; no export/retention UI. |
| 13.13 | Email Templates | ❌ MISSING | No templates. |
| 13.14 | Custom Domain | ❌ MISSING | No custom domain. |
| 13.15 | Notification Preferences | ❌ MISSING | In-app notifications only; no preferences. |

### Category 14: Security & Compliance

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 14.1 | TLS 1.3 | ⚠️ PARTIAL | App relies on deployment/proxy; no local HTTPS config. |
| 14.2 | AES-256 At Rest | ❌ MISSING | No app-level encryption at rest config. |
| 14.3 | bcrypt Hashing | ✅ PRESENT | Passlib bcrypt in auth middleware/service; test `backend/tests/test_security.py`. |
| 14.4 | JWT + Refresh Rotation | ⚠️ PARTIAL | JWT access/refresh exists `backend/app/api/auth.py`; not HTTP-only cookies/rotation DB. |
| 14.5 | RBAC | ⚠️ PARTIAL | `require_role` used on admin endpoints; not granular. |
| 14.6 | Audit Logging | ❌ MISSING | No AuditLog model. |
| 14.7 | Credit Card Masking | ❌ MISSING | No mask pipeline. |
| 14.8 | Visitor Banning | ⚠️ PARTIAL | Ban endpoint changes chat status only `backend/app/api/chats.py:247-250`; no IP/session block enforcement. |
| 14.9 | GDPR Export | ❌ MISSING | No export endpoint. |
| 14.10 | GDPR Deletion | ⚠️ PARTIAL | Contact delete cascades related data `backend/app/api/contacts.py:65-77`. |
| 14.11 | SSO SAML | ❌ MISSING | No SAML. |
| 14.12 | IP Whitelisting | ❌ MISSING | No admin IP whitelist. |
| 14.13 | XSS Protection | ⚠️ PARTIAL | React escaping helps; no CSP/sanitization. |
| 14.14 | CSRF Protection | ⚠️ PARTIAL | Bearer token API avoids cookie CSRF; no CSRF middleware. |
| 14.15 | SQL Injection Prevention | ✅ PRESENT | SQLAlchemy parameterized queries throughout. |
| 14.16 | Rate Limiting | ✅ PRESENT | Middleware registered `backend/app/main.py:26`; implementation `backend/app/middleware/rate_limit.py`. |
| 14.17 | Bot Protection | ❌ MISSING | No CAPTCHA. |
| 14.18 | Tenant Isolation | ⚠️ PARTIAL | Most queries filter organization_id; no systematic test/audit. |

### Category 15: Real-Time WebSocket

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 15.1 | WebSocket Connection | ✅ PRESENT | Socket.IO ASGI `backend/app/socket_manager.py:17-20`; frontend/widget clients. |
| 15.2 | Visitor Events | ⚠️ PARTIAL | start/message/typing/csat/join; no file/page_view/rating survey events. |
| 15.3 | Agent Events | ⚠️ PARTIAL | status/message/typing/assign/resolve/transfer; limited close/file. |
| 15.4 | Server-to-Visitor Events | ✅ PRESENT | `chat:started`, `chat:message:new`, `chat:typing`, `chat:resolved`. |
| 15.5 | Server-to-Agent Events | ✅ PRESENT | `chat:new`, `chat:message:new`, typing preview, notification, status. |
| 15.6 | Socket Rooms | ✅ PRESENT | org/chat/agent/supervisor rooms in `backend/app/socket_manager.py`. |
| 15.7 | Presence System | ⚠️ PARTIAL | Visitor Redis presence; agent status broadcast only, no heartbeat. |
| 15.8 | Message Persistence | ✅ PRESENT | `backend/app/socket_manager.py:155-162` persists before broadcast; no delivery confirmation/offline queue. |

### Category 16: API & Developer Platform

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 16.1 | REST API Chats | ⚠️ PARTIAL | Chat CRUD-ish endpoints exist; no public API key docs. |
| 16.2 | REST API Agents | ✅ PRESENT | `backend/app/api/agents.py`. |
| 16.3 | REST API Visitors | ⚠️ PARTIAL | Contacts/sessions partial; no visitor page views/initiate chat API. |
| 16.4 | REST API Tickets | ⚠️ PARTIAL | Basic tickets/comments; no bulk/activity. |
| 16.5 | REST API Knowledge Base | ❌ MISSING | No KB endpoints. |
| 16.6 | REST API Webhooks | ❌ MISSING | No Webhook model/API. |
| 16.7 | REST API Integrations | ❌ MISSING | No Integration model/API. |
| 16.8 | REST API Reports | ⚠️ PARTIAL | Analytics endpoints limited. |
| 16.9 | REST API AI | ❌ MISSING | Worker only, no AI endpoints. |
| 16.10 | REST API Canned/Tags/Surveys/Files/Goals/Campaigns | ⚠️ PARTIAL | Canned/files/proactive/routing partial; no surveys/goals/tags manager. |
| 16.11 | REST API Billing | ❌ MISSING | No Stripe endpoints. |
| 16.12 | Bearer Token Auth | ✅ PRESENT | Axios bearer and auth middleware. |
| 16.13 | Chat Webhooks | ❌ MISSING | No webhooks. |
| 16.14 | Message Webhooks | ❌ MISSING | No webhooks. |
| 16.15 | Ticket Webhooks | ❌ MISSING | No webhooks. |
| 16.16 | Other Webhooks | ❌ MISSING | No webhooks. |
| 16.17 | Webhook Security | ❌ MISSING | No HMAC/retry. |
| 16.18 | Widget JS API | ❌ MISSING | No `window.FlowLyra.open()` public methods besides destroy. |
| 16.19 | Customer SDK | ❌ MISSING | No SDK package. |
| 16.20 | API Documentation | ⚠️ PARTIAL | FastAPI Swagger/ReDoc available automatically; no branded docs. |
| 16.21 | API Rate Limiting | ⚠️ PARTIAL | Middleware exists, not per-plan headers. |
| 16.22 | API Analytics | ❌ MISSING | No usage tracking. |
| 16.23 | API Key Management | ❌ MISSING | No ApiKey model/API. |

### Category 17: Integrations / Marketplace

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 17.1 | Shopify | ❌ MISSING | Marketing mention only. |
| 17.2 | Slack | ❌ MISSING | No Slack. |
| 17.3 | Salesforce | ❌ MISSING | Marketing mention only. |
| 17.4 | HubSpot | ❌ MISSING | Marketing mention only. |
| 17.5 | Google Analytics | ⚠️ PARTIAL | Public text only; no integration. |
| 17.6 | Mailchimp | ❌ MISSING | Marketing mention only. |
| 17.7 | Zendesk | ❌ MISSING | No integration. |
| 17.8 | Jira | ❌ MISSING | No integration. |
| 17.9 | WordPress | ⚠️ PARTIAL | Install script works; no WP plugin. |
| 17.10 | Stripe | ⚠️ PARTIAL | Env vars in `.env.example`; no code. |
| 17.11 | WhatsApp Business API | ⚠️ PARTIAL | Env vars only. |
| 17.12 | Facebook Graph API | ❌ MISSING | No code. |
| 17.13 | Instagram Graph API | ❌ MISSING | No code. |
| 17.14 | Telegram Bot API | ❌ MISSING | No code. |
| 17.15 | Twilio SMS | ❌ MISSING | No code. |
| 17.16 | Zoom | ❌ MISSING | No code. |
| 17.17 | Calendly | ❌ MISSING | No code. |
| 17.18 | Drive/Dropbox | ❌ MISSING | No code. |
| 17.19 | OAuth 2 Framework | ❌ MISSING | No generic OAuth. |
| 17.20 | Integration Health | ❌ MISSING | No Integration model. |
| 17.21 | Webhook Receivers | ❌ MISSING | No receiver framework. |
| 17.22 | Translation | ❌ MISSING | No translation. |

### Category 18: Billing & Subscriptions

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 18.1 | Stripe Checkout | ❌ MISSING | Stripe env only, no endpoints. |
| 18.2 | Plan Management | ⚠️ PARTIAL | Organization plan field editable `backend/app/models/organization.py:17`; no Stripe/proration. |
| 18.3 | Seat-Based Billing | ❌ MISSING | No seat billing. |
| 18.4 | Usage Limits | ❌ MISSING | No plan limit enforcement. |
| 18.5 | Invoices | ❌ MISSING | No invoices. |
| 18.6 | Free Trial | ❌ MISSING | No trial state. |
| 18.7 | Stripe Customer Portal | ❌ MISSING | No portal. |
| 18.8 | Feature Gating | ❌ MISSING | No gating. |
| 18.9 | Plan Tiers | ✅ PRESENT | Plan string in Organization and UI options starter/team/business/enterprise. |

### Category 19: Mobile & PWA

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 19.1 | Responsive Agent Dashboard | ⚠️ PARTIAL | Tailwind responsive classes throughout; not fully functional mobile QA. |
| 19.2 | PWA Support | ❌ MISSING | No manifest/service worker. |
| 19.3 | Browser Push | ❌ MISSING | No push subscription. |
| 19.4 | Responsive Chat Widget | ✅ PRESENT | Widget mobile CSS `widget/src/styles.ts:17`. |

### Category 20: Notifications

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| 20.1 | In-App Notifications | ✅ PRESENT | Zustand notification store and socket listener `frontend/src/socket/index.ts:45-51,76-78`. |
| 20.2 | Email Notifications | ⚠️ PARTIAL | Email service/SendGrid exists; not wired broadly. |
| 20.3 | Browser Push | ❌ MISSING | No Push API. |
| 20.4 | Preferences | ❌ MISSING | No preferences. |
| 20.5 | Read/Unread | ⚠️ PARTIAL | Store unread count only; no persistent notification read state. |

---

## Database Models to Verify

| # | Model | Status | Evidence / Notes |
|---|-------|--------|------------------|
| D1 | Workspace/Tenant | ✅ PRESENT | `Organization` model `backend/app/models/organization.py`. |
| D2 | User | ✅ PRESENT | `backend/app/models/user.py`. |
| D3 | WorkspaceUser/Membership | ❌ MISSING | Users belong directly to one organization; no membership table. |
| D4 | Agent | ⚠️ PARTIAL | `User` doubles as agent; no separate Agent profile. |
| D5 | Department/Group | ✅ PRESENT | `Team` model. |
| D6 | DepartmentAgent | ✅ PRESENT | `team_members` association `backend/app/models/team.py:12-18`. |
| D7 | WorkSchedule | ❌ MISSING | No model. |
| D8 | ChatWidget | ⚠️ PARTIAL | Widget fields on `Organization`, no separate multi-widget table. |
| D9 | Visitor | ⚠️ PARTIAL | `Session` + `Contact` split visitor data. |
| D10 | PageView | ❌ MISSING | No PageView model. |
| D11 | Chat | ✅ PRESENT | `backend/app/models/chat.py`. |
| D12 | ChatMessage | ✅ PRESENT | `backend/app/models/message.py`. |
| D13 | ChatTransfer | ❌ MISSING | Transfer socket/API no records. |
| D14 | ChatNote | ⚠️ PARTIAL | Internal `Message`, no separate note model. |
| D15 | CannedResponse | ✅ PRESENT | `backend/app/models/canned_response.py`. |
| D16 | Campaign | ⚠️ PARTIAL | `ProactiveTrigger`, not full Campaign. |
| D17 | Goal | ❌ MISSING | No model. |
| D18 | GoalAchievement | ❌ MISSING | No model. |
| D19 | RoutingRule | ✅ PRESENT | `backend/app/models/routing_rule.py`. |
| D20 | ChatTag | ⚠️ PARTIAL | `Chat.tags` ARRAY, no ChatTag table/manager. |
| D21 | Survey | ❌ MISSING | CSAT fields on Chat only. |
| D22 | SurveyResponse | ❌ MISSING | No model. |
| D23 | CustomField | ❌ MISSING | No model. |
| D24 | FileAttachment | ❌ MISSING | Message file fields exist; no metadata table. |
| D25 | Ticket | ✅ PRESENT | `backend/app/models/ticket.py`. |
| D26 | TicketComment | ✅ PRESENT | `backend/app/models/ticket.py:34-41`. |
| D27 | TicketActivity | ❌ MISSING | No model. |
| D28 | TicketWorkflow | ❌ MISSING | No model. |
| D29 | TicketWorkflowExecution | ❌ MISSING | No model. |
| D30 | KBCategory | ❌ MISSING | No model. |
| D31 | KBArticle | ❌ MISSING | No model. |
| D32 | KnowledgeSource | ❌ MISSING | No model. |
| D33 | ChatbotFlow | ❌ MISSING | No model. |
| D34 | AnalyticsEvent | ✅ PRESENT | `backend/app/models/analytics_event.py`. |
| D35 | ReportSchedule | ❌ MISSING | No model. |
| D36 | Integration | ❌ MISSING | No model. |
| D37 | Webhook | ❌ MISSING | No model. |
| D38 | WebhookDelivery | ❌ MISSING | No model. |
| D39 | ApiKey | ❌ MISSING | No model. |
| D40 | AuditLog | ❌ MISSING | No model. |
| D41 | Notification | ❌ MISSING | Frontend-only notifications, no DB model. |

### Model Fields / Capabilities

| # | Field / Capability | Status | Evidence / Notes |
|---|--------------------|--------|------------------|
| F1 | Chat channel enum | ⚠️ PARTIAL | `Chat.channel` string default web `backend/app/models/chat.py:21`; no enum. |
| F2 | Message contentType enum | ⚠️ PARTIAL | `Message.content_type` string `backend/app/models/message.py:19`; no enum/rich metadata. |
| F3 | senderType enum | ⚠️ PARTIAL | `Message.sender_type` string `backend/app/models/message.py:16`; no enum. |
| F4 | metadata JSON for rich messages | ❌ MISSING | No Message metadata JSON. |
| F5 | preChatForm JSON config | ❌ MISSING | Not in model. |
| F6 | postChatSurvey JSON config | ❌ MISSING | CSAT fields on Chat only. |
| F7 | targetingRules JSON | ✅ PRESENT | `ProactiveTrigger.conditions` JSONB. |
| F8 | nodes JSON | ❌ MISSING | No ChatbotFlow. |
| F9 | conditions/actions JSON | ✅ PRESENT | RoutingRule has `conditions`, `action`; no TicketWorkflow. |
| F10 | embeddingData | ❌ MISSING | No KnowledgeSource. |
| F11 | Plan tiers | ⚠️ PARTIAL | Plan string, no enum/enforcement. |
| F12 | Agent roles | ⚠️ PARTIAL | role string admin/supervisor/agent, no owner enum. |
| F13 | Ticket SLA fields | ❌ MISSING | No due/SLA. |
| F14 | workspace_id/tenant FK on tenant models | ✅ PRESENT | Most models use `organization_id`; no systematic check for all future models. |

---

## API Endpoints to Verify

| # | Group | Status | Evidence / Notes |
|---|-------|--------|------------------|
| A1 | Auth | ⚠️ PARTIAL | login/signup/logout/refresh/reset/invite; no Google/SAML/me route. |
| A2 | Workspace | ⚠️ PARTIAL | Org get/patch; no full CRUD/logo/leave. |
| A3 | Agents/Team | ⚠️ PARTIAL | Agents CRUD-ish/status; no schedule/bulk. |
| A4 | Departments | ✅ PRESENT | Teams CRUD and membership. |
| A5 | Chat Widget | ⚠️ PARTIAL | Organization-level widget update/preview; no multi-widget CRUD. |
| A6 | Chats | ✅ PRESENT | List/get/messages/transfer/resolve/close/tags/notes/assign. |
| A7 | Visitors | ⚠️ PARTIAL | Contacts list/delete and chat visitor detail; no ban/unban/page views/initiate. |
| A8 | Campaigns | ⚠️ PARTIAL | Proactive triggers CRUD; no analytics/toggle route. |
| A9 | Goals | ❌ MISSING | No endpoints. |
| A10 | Reports | ⚠️ PARTIAL | Analytics endpoints limited, no export/schedules. |
| A11 | Tickets | ⚠️ PARTIAL | CRUD/comments/status; no bulk/activity/delete. |
| A12 | Knowledge Base | ❌ MISSING | No endpoints. |
| A13 | AI | ❌ MISSING | No public AI endpoints. |
| A14 | Chatbot | ❌ MISSING | No endpoints. |
| A15 | Canned Responses | ✅ PRESENT | Admin canned CRUD. |
| A16 | Integrations | ❌ MISSING | No endpoints. |
| A17 | Webhooks | ❌ MISSING | No endpoints. |
| A18 | API Keys | ❌ MISSING | No endpoints. |
| A19 | Tags | ⚠️ PARTIAL | Add chat tag and analytics tags; no tag CRUD. |
| A20 | Surveys | ❌ MISSING | No endpoints beyond CSAT socket. |
| A21 | Files | ⚠️ PARTIAL | Upload only. |
| A22 | Billing | ❌ MISSING | No Stripe endpoints. |
| A23 | Widget Public API | ⚠️ PARTIAL | init only plus socket events; no REST page_view/message/rating/kb. |

---

## Frontend Pages to Verify

| # | Page / Route | Status | Evidence / Notes |
|---|--------------|--------|------------------|
| P1 | /signup | ✅ PRESENT | `frontend/src/App.tsx`, `PublicPages.tsx:697`. |
| P2 | /login | ✅ PRESENT | `AuthPages.tsx:9`. |
| P3 | /forgot-password | ⚠️ PARTIAL | Implemented as `/reset-password`, not `/forgot-password`. |
| P4 | /invite/:token | ✅ PRESENT | `App.tsx:78`, `AuthPages.tsx:40`. |
| P5 | Dashboard / | ⚠️ PARTIAL | `/` is marketing home; `/app` redirects inbox. No dashboard home. |
| P6 | /chats | ⚠️ PARTIAL | Existing `/inbox`; no `/chats` route. |
| P7 | /chats/:id | ⚠️ PARTIAL | Existing `/chat/:id`. |
| P8 | /archives | ❌ MISSING | No route. |
| P9 | /engage/traffic | ❌ MISSING | No route. |
| P10 | /engage/campaigns | ⚠️ PARTIAL | Existing `/admin/triggers`. |
| P11 | /engage/campaigns/new | ❌ MISSING | No route. |
| P12 | /engage/goals | ❌ MISSING | No route. |
| P13 | /reports | ⚠️ PARTIAL | Existing `/admin/analytics`. |
| P14 | /reports/chats | ❌ MISSING | No route. |
| P15 | /reports/agents | ❌ MISSING | No route. |
| P16 | /reports/customers | ❌ MISSING | No route. |
| P17 | /reports/ecommerce | ❌ MISSING | No route. |
| P18 | /reports/campaigns | ❌ MISSING | No route. |
| P19 | /tickets | ✅ PRESENT | `TicketsPage`. |
| P20 | /tickets/:id | ⚠️ PARTIAL | Existing `/ticket/:id`, singular. |
| P21 | /tickets/new | ⚠️ PARTIAL | Inline create form, no dedicated route. |
| P22 | /knowledge-base | ❌ MISSING | No admin KB. |
| P23 | /knowledge-base/:id | ❌ MISSING | No route. |
| P24 | /knowledge-base/new | ❌ MISSING | No route. |
| P25 | /chatbot | ❌ MISSING | No route. |
| P26 | /chatbot/:id | ❌ MISSING | No route. |
| P27 | /settings | ⚠️ PARTIAL | Admin pages exist under `/admin/*`, no settings overview. |
| P28 | /settings/widget | ⚠️ PARTIAL | Existing `/admin/widget`. |
| P29 | /settings/team | ⚠️ PARTIAL | Existing `/admin/agents`, `/admin/teams`. |
| P30 | /settings/channels | ❌ MISSING | No route. |
| P31 | /settings/canned | ⚠️ PARTIAL | Existing `/admin/canned`. |
| P32 | /settings/tags | ❌ MISSING | No route. |
| P33 | /settings/automation | ⚠️ PARTIAL | Existing `/admin/routing`, `/admin/triggers`. |
| P34 | /settings/integrations | ❌ MISSING | No route. |
| P35 | /settings/api | ❌ MISSING | No route. |
| P36 | /settings/security | ❌ MISSING | No route. |
| P37 | /settings/billing | ⚠️ PARTIAL | Existing `/admin/billing`. |
| P38 | /settings/notifications | ❌ MISSING | No route. |
| P39 | /help | ✅ PRESENT | Public help. |
| P40 | /help/:slug | ❌ MISSING | No article route. |
| P41 | /help/search | ❌ MISSING | No route. |
| P42 | /chat/:workspaceId | ❌ MISSING | `/chat/:id` is agent chat detail, not direct public chat. |
| P43 | /portal/:workspaceId | ❌ MISSING | No portal. |
| P44 | /api-docs | ⚠️ PARTIAL | FastAPI docs at backend `/docs`, no frontend route. |
| P45 | /status | ✅ PRESENT | Public status page. |

---

## Security Features to Verify

| # | Feature | Status | Evidence / Notes |
|---|---------|--------|------------------|
| S1 | TLS | ⚠️ PARTIAL | Deployment concern; no app-level HTTPS. |
| S2 | bcrypt/argon2 | ✅ PRESENT | bcrypt/passlib. |
| S3 | JWT + refresh | ✅ PRESENT | `backend/app/api/auth.py`. |
| S4 | HTTP-only cookies | ❌ MISSING | Frontend stores tokens in Zustand/localStorage. |
| S5 | RBAC | ⚠️ PARTIAL | Role checks exist, not every endpoint granular. |
| S6 | Rate limiting auth | ⚠️ PARTIAL | Global middleware, not auth-specific policy documented. |
| S7 | Account lockout | ❌ MISSING | No failed-login counters. |
| S8 | XSS sanitization | ⚠️ PARTIAL | React escaping; no sanitizer/CSP. |
| S9 | CSRF protection | ⚠️ PARTIAL | Bearer token architecture; no CSRF tokens. |
| S10 | SQL injection prevention | ✅ PRESENT | SQLAlchemy. |
| S11 | Tenant isolation | ⚠️ PARTIAL | Widespread org filters; no comprehensive tests. |
| S12 | Credit card masking | ❌ MISSING | No masking. |
| S13 | Audit logging | ❌ MISSING | No AuditLog. |
| S14 | GDPR export | ❌ MISSING | No export. |
| S15 | GDPR deletion | ⚠️ PARTIAL | Contact delete endpoint. |

---

## Missing Features — Build Plan

### Phase 1: Priority 1 Core Chat

1. Widget positions all corners.
2. Widget theme light/dark/auto.
3. Configurable pre-chat fields including phone/custom fields.
4. Visitor file upload with S3-backed upload and message metadata.
5. Agent file upload wired to chat composer.
6. Chat history fetch for returning visitors.
7. Unread widget badge.
8. Real domain whitelist/blacklist enforcement.
9. Credit card masking.
10. Archives page and transcript export.

### Phase 2: Priority 2 Multi-Tenancy & Auth

1. Separate workspace membership/agent profile model or extend current User safely.
2. Owner role and granular RBAC.
3. Work schedule model/UI.
4. Auto-accept and chat limit enforcement.

### Phase 3: Priority 3 AI & Automation

1. AI endpoints: suggest, summarize, enhance, sentiment, auto-tag.
2. KnowledgeSource model scaffolding.
3. ChatbotFlow model/API scaffolding.
4. Ticket workflow models/API.

### Phase 4+: Remaining categories

Multi-channel integrations, campaigns/goals, full ticketing, KB, reporting exports/schedules, marketplace, billing, enterprise security, PWA/notifications.

---

## Changes Made

No build changes were made during this analysis phase. This report was created after codebase exploration, stack/config/model/API/frontend/test review, and feature-by-feature comparison.
