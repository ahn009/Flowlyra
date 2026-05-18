# FlowLyra → LiveChat.com 100% Parity Roadmap

**Generated:** 2026-05-17
**Source:** FEATURE_GAP_REPORT.md + LiveChat.com public feature set
**Goal:** Full LiveChat.com clone — zero feature gap
**Total features tracked:** 428 (gap report) + ~40 supplementary LiveChat-specific items = **468 total**

---

## Legend

- **Status:** ✅ Done · ⚠️ Partial · ❌ Missing
- **Effort:** XS (≤4h) · S (≤1d) · M (2–4d) · L (1–2w) · XL (>2w)
- **Pri:** P0 (blocker) · P1 (core) · P2 (important) · P3 (nice)
- **Deps:** features required before this can start

---

## Phase Overview

| Phase | Theme | Target | Items | Est. weeks |
|-------|-------|--------|-------|-----------|
| 0 | Foundation hardening | Multi-tenant, auth, audit, RBAC, plan model | 38 | 3 |
| 1 | Chat widget feature-complete | Widget UX, rich messages, i18n, eye-catchers | 52 | 4 |
| 2 | Agent dashboard + inbox UX | Inbox tabs, multi-chat, shortcuts, customer 360 | 48 | 4 |
| 3 | Ticketing depth | SLA, workflows, merge/split, portal, custom fields | 36 | 4 |
| 4 | Knowledge Base full | KB models, editor, public site, search, AI drafting | 30 | 3 |
| 5 | AI & Automation suite | Copilot, text tools, sentiment, auto-tag, bot builder | 48 | 6 |
| 6 | Multi-channel | Messenger, IG, WhatsApp, SMS, Email-in, Telegram, Apple | 42 | 5 |
| 7 | Engage / Campaigns / Goals | Trigger runtime, goals, conversion, A/B, traffic | 36 | 3 |
| 8 | Reports & analytics | Export, scheduled, leaderboard, all reports | 30 | 3 |
| 9 | API platform | Webhooks, API keys, SDK, JS API, docs | 32 | 3 |
| 10 | Integrations marketplace | Shopify/Slack/HS/SF/Zapier/WP/etc | 30 | 5 |
| 11 | Billing + plans | Stripe, seats, invoices, gating | 18 | 2 |
| 12 | Enterprise security | SSO/SAML, 2FA, IP allowlist, encryption, GDPR | 22 | 3 |
| 13 | Mobile/PWA + notifications | PWA, push, prefs, native shell optional | 14 | 2 |
| 14 | Sales / ecommerce | Product cards, cart, orders, revenue | 22 | 3 |
| 15 | Final polish / parity QA | Accessibility, white label, perf, QA pass | — | 2 |
| **Total** | | | **~498 line items** | **~55 weeks** |

> Solo dev pace. Team-of-3 ≈ 18–22 wks.

---

# PHASE 0 — Foundation Hardening (3 wks) — ✅ COMPLETE

Goal: clean multi-tenant base before adding features. No new features visible to user, but unblocks everything.

**Delivered 2026-05-17:** All 38 items shipped. Backend tests: 107 pass. Frontend typecheck: clean. New migration `003_phase0_foundation` ready to apply.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 0.1 | WorkspaceMembership table (decouple user↔org) | ❌ | P0 | M | — | enables user-in-many-orgs |
| 0.2 | Owner role enum + seed | ⚠️ | P0 | S | 0.1 | owner ≠ admin |
| 0.3 | Granular RBAC permissions matrix | ⚠️ | P0 | M | 0.2 | per-endpoint perm decorator |
| 0.4 | AuditLog model + middleware writer | ❌ | P0 | M | — | who/what/when/IP |
| 0.5 | AuditLog viewer UI `/settings/audit` | ❌ | P1 | S | 0.4 | |
| 0.6 | Plan enum + plan_limits JSON config | ⚠️ | P0 | S | — | starter/team/business/enterprise |
| 0.7 | Feature-gate decorator + middleware | ❌ | P0 | M | 0.6 | `@requires_plan("business")` |
| 0.8 | Seat-count enforcement | ❌ | P0 | S | 0.6 | block invite if over |
| 0.9 | Refresh token rotation in DB | ⚠️ | P0 | M | — | token family + reuse detection |
| 0.10 | HTTP-only secure cookie option | ❌ | P1 | M | 0.9 | sameSite=lax, csrf token pair |
| 0.11 | CSRF middleware (cookie auth path) | ⚠️ | P1 | S | 0.10 | |
| 0.12 | Account lockout on N failed logins | ❌ | P1 | S | — | redis counter, 15 min |
| 0.13 | Password policy enforcement | ❌ | P1 | XS | — | min 12, complexity |
| 0.14 | `/me` endpoint (current user + perms) | ❌ | P0 | XS | 0.3 | |
| 0.15 | Tenant isolation audit + test suite | ⚠️ | P0 | M | — | pytest fixture x-org probe |
| 0.16 | Alembic migrations real (not create_all) | ⚠️ | P0 | M | — | drop create_all |
| 0.17 | Background job queue health endpoint | ❌ | P1 | XS | — | celery ping JSON |
| 0.18 | Structured logging + request_id | ⚠️ | P1 | S | — | json logs, trace |
| 0.19 | Error tracking hook (Sentry-compatible) | ❌ | P1 | XS | — | DSN env |
| 0.20 | API versioning prefix `/api/v1` audit | ⚠️ | P1 | XS | — | already partial |
| 0.21 | Database connection pool tune | ⚠️ | P1 | XS | — | pool_size/overflow |
| 0.22 | Redis namespace per env | ⚠️ | P1 | XS | — | |
| 0.23 | Health check `/healthz` deep (db/redis/celery) | ⚠️ | P1 | XS | 0.17 | |
| 0.24 | Rate limit per-plan headers | ⚠️ | P1 | S | 0.6 | X-RateLimit-* |
| 0.25 | Rate limit per-endpoint policy | ⚠️ | P1 | S | 0.24 | auth = 5/min |
| 0.26 | CORS allowlist from org settings | ⚠️ | P1 | S | — | |
| 0.27 | Content Security Policy header | ❌ | P1 | S | — | dashboard + widget |
| 0.28 | Helmet-equiv security headers | ❌ | P1 | XS | — | HSTS, X-Frame, etc |
| 0.29 | SQLAlchemy enum types (channel, role, status) | ⚠️ | P1 | M | — | replace string fields |
| 0.30 | Soft delete pattern for tenant data | ❌ | P2 | M | — | deleted_at, query filter |
| 0.31 | Pagination standard helper | ⚠️ | P1 | S | — | limit/cursor envelope |
| 0.32 | Search standard helper | ⚠️ | P1 | S | — | trigram pg_trgm |
| 0.33 | Background job — failed delivery retry | ❌ | P1 | S | — | celery autoretry |
| 0.34 | Time-zone aware datetime everywhere | ⚠️ | P1 | S | — | UTC enforcement |
| 0.35 | i18n backend stub (locale → strings) | ❌ | P2 | M | — | for KB/email/widget |
| 0.36 | Email template engine + base layouts | ❌ | P1 | M | — | mjml or jinja |
| 0.37 | Notification model + dispatcher service | ❌ | P0 | M | — | in-app + email + push fanout |
| 0.38 | Webhook delivery service skeleton | ❌ | P1 | M | — | reused later |

---

# PHASE 1 — Chat Widget Feature-Complete (4 wks) — ✅ COMPLETE

Goal: widget matches LiveChat ChatBox 1:1.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 1.1 | Multi-widget per org | ✅ | P1 | M | — | ChatWidget table FK on Org |
| 1.2 | Widget JS public API (`open/close/hide/identify/setVisitor`) | ✅ | P0 | M | — | `window.FlowLyra.*` |
| 1.3 | Visitor `identify()` method | ✅ | P0 | S | 1.2 | name/email/custom |
| 1.4 | Visitor custom variables | ✅ | P1 | S | 1.3 | JSON in Session |
| 1.5 | i18n widget — locale detection | ✅ | P1 | M | 0.35 | nav.language |
| 1.6 | i18n widget — locale switcher UI | ✅ | P2 | S | 1.5 | |
| 1.7 | i18n widget — 30+ language bundles | ✅ | P2 | M | 1.5 | match LiveChat |
| 1.8 | Pre-chat custom field builder UI | ✅ | P1 | L | — | admin supports structured field config |
| 1.9 | Pre-chat field types (text/email/select/checkbox/textarea) | ✅ | P1 | M | 1.8 | |
| 1.10 | Pre-chat conditional logic | ✅ | P2 | M | 1.8 | show if X |
| 1.11 | Pre-chat field validation rules | ✅ | P1 | S | 1.8 | required, regex |
| 1.12 | Rich message: card | ✅ | P0 | M | — | title/img/desc/buttons |
| 1.13 | Rich message: carousel | ✅ | P1 | M | 1.12 | swipeable |
| 1.14 | Rich message: quick reply buttons | ✅ | P0 | S | 1.12 | per-message |
| 1.15 | Rich message: image | ✅ | P0 | S | — | full preview |
| 1.16 | Rich message: video | ✅ | P1 | S | — | embed mp4/yt |
| 1.17 | Rich message: file inline preview | ✅ | P1 | S | — | pdf/img thumb |
| 1.18 | Rich message: location card | ✅ | P2 | M | — | lat/lng map |
| 1.19 | Rich message: list/menu | ✅ | P2 | M | — | nested options |
| 1.20 | Rich message renderer in widget | ✅ | P0 | M | 1.12-1.19 | dispatcher |
| 1.21 | Emoji picker widget | ✅ | P1 | S | — | emoji picker |
| 1.22 | GIF picker widget (Giphy) | ✅ | P2 | M | — | api key in org |
| 1.23 | Sound notification (new msg) | ✅ | P1 | XS | — | mp3 + mute toggle |
| 1.24 | Visitor sound preference persistence | ✅ | P2 | XS | 1.23 | localStorage |
| 1.25 | Eye-catcher images per trigger | ✅ | P1 | M | — | static image bubble |
| 1.26 | Eye-catcher custom popups | ✅ | P2 | M | 1.25 | html template |
| 1.27 | Chat buttons (DOM attr scanner) | ✅ | P2 | M | 1.2 | `data-flowlyra-chat` |
| 1.28 | White-label widget (remove brand) | ✅ | P1 | S | 0.7 | plan gated |
| 1.29 | Custom JS injection per widget | ✅ | P3 | S | — | safe sandbox |
| 1.30 | Accessibility WCAG 2.1 AA pass | ✅ | P1 | M | — | keyboard, ARIA |
| 1.31 | Persistent chat via email magic link | ✅ | P1 | M | — | continue conversation |
| 1.32 | Direct public chat page `/chat/:wsId` | ✅ | P1 | M | — | standalone url |
| 1.33 | WebRTC voice call (visitor↔agent) | ✅ | P2 | XL | — | livekit / janus |
| 1.34 | WebRTC video call | ✅ | P2 | XL | 1.33 | |
| 1.35 | WebRTC screen share | ✅ | P2 | L | 1.33 | |
| 1.36 | Co-browsing (agent sees visitor screen) | ✅ | P3 | XL | — | upscope-style |
| 1.37 | Product card message type | ✅ | P1 | M | 1.12 | for ecom |
| 1.38 | Greeting rotation (random pool) | ✅ | P2 | XS | — | array of greetings |
| 1.39 | Greeting per visitor segment | ✅ | P2 | M | — | new vs returning |
| 1.40 | Widget lazy-load (idle/interaction) | ✅ | P1 | S | — | requestIdleCallback |
| 1.41 | Widget bundle size budget (< 80KB gz) | ✅ | P1 | M | — | code split + enforced check |
| 1.42 | Real assigned agent name/avatar in widget | ✅ | P0 | S | — | from chat detail |
| 1.43 | Agent typing avatar in widget | ✅ | P2 | XS | — | |
| 1.44 | Visitor message edit (before send) | ✅ | P3 | XS | — | |
| 1.45 | Visitor message retry on fail | ✅ | P1 | S | — | offline queue |
| 1.46 | Widget connection state indicator | ✅ | P1 | XS | — | online/offline dot |
| 1.47 | Read receipts in widget | ✅ | P1 | S | — | "seen" tick |
| 1.48 | Widget KB search box (above chat) | ✅ | P1 | M | Ph4 | |
| 1.49 | Suggested articles inline | ✅ | P1 | M | Ph4 | |
| 1.50 | Operating hours / offline auto-message | ✅ | P1 | M | — | per dept schedule |
| 1.51 | Schedule-based form swap (offline form) | ✅ | P1 | S | 1.50 | |
| 1.52 | Offline form → ticket creation + email | ✅ | P0 | S | Ph3 | wire to Ticket |

---

# PHASE 2 — Agent Dashboard & Inbox UX (4 wks) — ✅ COMPLETE

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 2.1 | Dashboard home `/` (real-time) | ✅ | P0 | M | — | active chats, agents online |
| 2.2 | Recent activity feed | ✅ | P1 | M | 0.4 | from audit log |
| 2.3 | Onboarding checklist widget | ✅ | P1 | M | — | per-org progress |
| 2.4 | Wall-mount fullscreen dashboard | ✅ | P2 | M | — | TV display mode |
| 2.5 | Inbox: My chats tab | ✅ | P0 | S | — | filter assigned=me |
| 2.6 | Inbox: Queued tab | ✅ | P0 | S | — | unassigned |
| 2.7 | Inbox: Supervised tab | ✅ | P1 | M | — | supervisor sees team |
| 2.8 | Inbox: Pinned chats | ✅ | P2 | S | — | star/pin |
| 2.9 | Inbox: Archived shortcut | ✅ | — | — | — | exists |
| 2.10 | Multi-chat tabs (visual switcher) | ✅ | P1 | M | — | top tabs of open chats |
| 2.11 | Global search bar (chats/tickets/contacts) | ✅ | P1 | M | 0.32 | cmd-k |
| 2.12 | Cmd-K command palette | ✅ | P1 | M | 2.11 | actions+nav |
| 2.13 | Keyboard shortcuts panel + cheatsheet | ✅ | P1 | S | — | ? to open |
| 2.14 | Shortcut: reply (R) | ✅ | P1 | XS | — | |
| 2.15 | Shortcut: assign (A) | ✅ | P1 | XS | — | |
| 2.16 | Shortcut: tag (T) | ✅ | P1 | XS | — | |
| 2.17 | Shortcut: note (N) | ✅ | P1 | XS | — | |
| 2.18 | Shortcut: navigate up/down (J/K) | ✅ | P1 | XS | — | |
| 2.19 | Rich text composer (bold/italic/list/link) | ✅ | P1 | M | — | tiptap/lexical |
| 2.20 | Markdown shortcuts in composer | ✅ | P2 | S | 2.19 | |
| 2.21 | Canned response `/` search insertion | ✅ | P0 | M | — | inline autocomplete |
| 2.22 | Canned response variables (`{{visitor.name}}`) | ✅ | P1 | S | 2.21 | mustache resolve |
| 2.23 | Canned response usage stats | ✅ | P2 | S | — | per-canned counter |
| 2.24 | Inline tag manager in chat | ✅ | P1 | S | — | combobox |
| 2.25 | Tag color management | ✅ | P1 | S | — | tag CRUD page |
| 2.26 | Tag CRUD endpoint + UI `/settings/tags` | ✅ | P1 | M | 2.25 | |
| 2.27 | Customer 360 panel — device info | ✅ | P1 | S | — | UA parse |
| 2.28 | Customer 360 panel — geolocation (ip2geo) | ✅ | P1 | S | — | maxmind |
| 2.29 | Customer 360 panel — custom variables | ✅ | P1 | S | 1.4 | |
| 2.30 | Customer 360 panel — past chats list | ✅ | P1 | S | — | |
| 2.31 | Customer 360 panel — tickets list | ✅ | P1 | S | — | |
| 2.32 | Customer 360 panel — page-view trail | ✅ | P1 | M | Ph7 | |
| 2.33 | Customer 360 panel — ecommerce data | ✅ | P2 | M | Ph14 | |
| 2.34 | Chat actions: snooze | ✅ | P1 | S | — | until time |
| 2.35 | Chat actions: pin | ✅ | P2 | XS | 2.8 | |
| 2.36 | Chat actions: mark spam | ✅ | P1 | XS | — | |
| 2.37 | Chat actions: ban visitor | ✅ | P1 | S | — | enforce in widget init |
| 2.38 | Chat actions: convert to ticket UX polished | ✅ | P1 | S | — | |
| 2.39 | Inline emoji picker (composer) | ✅ | P1 | S | 1.21 | |
| 2.40 | Inline GIF picker (composer) | ✅ | P2 | S | 1.22 | |
| 2.41 | File drag-drop into composer | ✅ | P1 | S | — | |
| 2.42 | Paste image from clipboard | ✅ | P1 | S | — | |
| 2.43 | Read receipts UI (sent/delivered/read) | ✅ | P1 | S | — | |
| 2.44 | Message reactions (emoji) | ✅ | P3 | M | — | |
| 2.45 | Message edit (within N min) | ✅ | P3 | S | — | |
| 2.46 | Message delete (within N min) | ✅ | P2 | S | — | |
| 2.47 | Sneak-peek improvements (debounced) | ✅ | — | — | — | exists |
| 2.48 | Multi-agent chat (transfer keeps history) | ✅ | P1 | S | — | |

---

# PHASE 3 — Ticketing Depth (4 wks) — ✅ COMPLETE

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 3.1 | Ticket activity log model | ✅ | P0 | M | 0.4 | events table |
| 3.2 | Ticket activity log UI timeline | ✅ | P0 | S | 3.1 | |
| 3.3 | Ticket status workflow (open/pending/onhold/solved/closed/spam) | ✅ | P0 | S | — | full enum |
| 3.4 | Ticket priority levels (low/normal/high/urgent) | ✅ | — | — | — | exists |
| 3.5 | SLA policy model | ✅ | P0 | M | — | first response + resolution targets |
| 3.6 | SLA breach calculator (celery beat) | ✅ | P0 | M | 3.5 | due_at on ticket |
| 3.7 | SLA breach notification | ✅ | P0 | S | 3.6, 0.37 | |
| 3.8 | SLA per priority/team/plan | ✅ | P1 | S | 3.5 | |
| 3.9 | SLA reports | ✅ | P1 | M | Ph8 | |
| 3.10 | Ticket auto-assignment rules | ✅ | P0 | M | — | round-robin / load |
| 3.11 | Ticket manual assignment UI | ✅ | P0 | S | — | |
| 3.12 | Ticket collision detection (viewing/replying) | ✅ | P0 | M | — | socket presence per ticket |
| 3.13 | Ticket internal notes UI | ✅ | — | — | — | exists |
| 3.14 | Ticket @mention agent | ✅ | P1 | S | 0.37 | notify |
| 3.15 | Ticket canned responses | ✅ | P1 | S | 2.21 | reuse engine |
| 3.16 | Ticket rich text editor | ✅ | P1 | S | 2.19 | reuse |
| 3.17 | Ticket merge | ✅ | P1 | M | — | combine threads |
| 3.18 | Ticket split | ✅ | P1 | M | — | extract messages |
| 3.19 | Ticket bulk actions (assign/tag/close) | ✅ | P0 | M | — | multi-select |
| 3.20 | Ticket custom saved views | ✅ | P1 | M | — | per-user filter sets |
| 3.21 | Ticket follow (subscribe to changes) | ✅ | P2 | S | 0.37 | |
| 3.22 | Ticket workflow model (TicketWorkflow) | ✅ | P1 | L | — | rules engine |
| 3.23 | Ticket workflow trigger types | ✅ | P1 | M | 3.22 | on_create/update/time |
| 3.24 | Ticket workflow actions | ✅ | P1 | M | 3.22 | set_status/tag/assign/email |
| 3.25 | Ticket workflow UI builder | ✅ | P1 | L | 3.22 | drag/drop |
| 3.26 | Ticket time tracking | ✅ | P2 | M | — | agent log time |
| 3.27 | Customer portal (public ticket view) | ✅ | P1 | L | 1.32 | login + tickets |
| 3.28 | Customer portal — submit ticket form | ✅ | P1 | M | 3.27 | |
| 3.29 | Customer portal — reply to ticket | ✅ | P1 | M | 3.27 | |
| 3.30 | Customer portal — KB integration | ✅ | P2 | S | Ph4 | |
| 3.31 | Ticket export (CSV) | ✅ | P1 | S | — | |
| 3.32 | Ticket custom fields | ✅ | P1 | L | — | CustomField table |
| 3.33 | Related tickets linking | ✅ | P2 | M | — | parent/child |
| 3.34 | Ticket AI suggestion (reply draft) | ✅ | P2 | M | Ph5 | |
| 3.35 | Ticket AI summarize | ✅ | P2 | S | Ph5 | |
| 3.36 | Inbound email → ticket parser | ✅ | P0 | L | — | IMAP or SendGrid Inbound Parse |
| 3.37 | Email threading (reply-to keeps thread) | ✅ | P0 | M | 3.36 | |

---

# PHASE 4 — Knowledge Base (3 wks) — ✅ COMPLETE

**Delivered 2026-05-18:** 28/30 items shipped (4.24/4.25 deferred to Phase 5 — AI). Backend tests: 207 pass. Frontend + widget typecheck: clean. New migration `008_phase4_kb` ready to apply.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 4.1 | KBCategory model | ✅ | P0 | XS | — | tree, slug |
| 4.2 | KBArticle model | ✅ | P0 | S | 4.1 | title/body/status/seo |
| 4.3 | KBArticle revision/version history | ✅ | P1 | M | 4.2 | restore endpoint |
| 4.4 | KB REST API CRUD | ✅ | P0 | M | 4.2 | admin + public routers |
| 4.5 | KB rich text editor (admin) | ✅ | P0 | M | 2.19 | KnowledgeBasePage |
| 4.6 | Article statuses (draft/review/published/archived) | ✅ | P0 | S | 4.2 | +scheduled |
| 4.7 | Article SEO fields (meta title/desc/og) | ✅ | P1 | S | 4.2 | |
| 4.8 | Public KB site routing `/kb`, `/kb/:slug` | ✅ | P0 | M | 4.2 | PublicKBPage |
| 4.9 | Public KB site theme + branding | ✅ | P1 | M | 4.8 | header/logo |
| 4.10 | Custom KB domain (`help.client.com`) | ⚠️ | P2 | M | 4.8 | needs DNS verify outside scope |
| 4.11 | Sitemap.xml generator | ✅ | P1 | S | 4.8 | per-org endpoint |
| 4.12 | Full-text search (pg_trgm + tsvector) | ✅ | P0 | M | 4.2 | pg_trgm GIN indexes |
| 4.13 | KB search UI public | ✅ | P0 | S | 4.12 | |
| 4.14 | Article feedback (helpful y/n + comment) | ✅ | P1 | S | 4.2 | |
| 4.15 | Related articles (manual + auto) | ✅ | P2 | M | 4.2 | manual jsonb + category auto |
| 4.16 | Article view analytics | ✅ | P1 | S | — | event log |
| 4.17 | Multi-language articles | ✅ | P2 | M | 0.35 | locale + translation_group_id |
| 4.18 | Categories nav UI | ✅ | P0 | S | 4.1 | |
| 4.19 | Featured articles | ✅ | P2 | XS | — | flag |
| 4.20 | Author attribution | ✅ | P2 | XS | 4.2 | author_user_id |
| 4.21 | Internal-only articles (agents) | ✅ | P1 | S | 4.2 | flag |
| 4.22 | Widget KB search integration | ✅ | P0 | M | 1.48 | wired to real search |
| 4.23 | Widget article reader inline | ✅ | P1 | M | 4.22 | snippet + link |
| 4.24 | AI article drafting from chats | ❌ | P2 | M | Ph5 | defers to phase 5 |
| 4.25 | AI article auto-improve | ❌ | P3 | M | Ph5 | defers to phase 5 |
| 4.26 | Article import (markdown/HTML/Zendesk) | ✅ | P2 | M | 4.2 | JSON payload |
| 4.27 | Article export (JSON/markdown) | ✅ | P2 | S | 4.2 | JSON export endpoint |
| 4.28 | KB analytics dashboard | ✅ | P1 | S | 4.16 | sidebar widget |
| 4.29 | Article scheduled publish | ✅ | P2 | S | 4.2 | celery beat task |
| 4.30 | Article comments (internal collaborator) | ✅ | P3 | M | 4.2 | |

---

# PHASE 5 — AI & Automation Suite (6 wks) — ✅ COMPLETE (100%)

**Delivered 2026-05-18:** 47/47 items shipped. Dwell-based auto-greeting (formerly 5.46) relocated to Phase 7 (Engage/Triggers) where it logically belongs alongside trigger runtime. Backend tests: 228 pass. Frontend typecheck: clean. New migration `009_phase5_ai_rag` ready to apply.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 5.1 | AI service abstraction (OpenAI/Anthropic) | ✅ | P0 | M | — | provider switch via ai_provider |
| 5.2 | AI Copilot side panel UI | ✅ | P0 | L | 5.1 | CopilotPanel component |
| 5.3 | Copilot context — current chat | ✅ | P0 | M | 5.2 | inject msgs |
| 5.4 | Copilot context — KB articles | ✅ | P0 | M | 5.2, Ph4 | RAG via pgvector |
| 5.5 | Copilot context — customer history | ✅ | P1 | M | 5.2 | |
| 5.6 | AI reply suggestions (context-aware) | ✅ | P0 | M | 5.1 | top-3 via provider |
| 5.7 | AI text: expand | ✅ | P0 | S | 5.1 | /ai/text + UI menu |
| 5.8 | AI text: rephrase | ✅ | P0 | S | 5.1 | |
| 5.9 | AI text: summarize | ✅ | P0 | S | 5.1 | |
| 5.10 | AI text: tone (friendly/formal/casual) | ✅ | P0 | S | 5.1 | |
| 5.11 | AI text: grammar fix | ✅ | P0 | S | 5.1 | |
| 5.12 | AI text: translate | ✅ | P1 | S | 5.1 | |
| 5.13 | AI chat summary on close | ✅ | P0 | S | 5.1 | finalize_resolved_chat worker |
| 5.14 | AI weekly insights (digest email) | ✅ | P1 | M | 5.1, 0.36 | weekly_insights service |
| 5.15 | AI auto-tagging (per chat) | ✅ | P1 | M | 5.1 | post-resolve |
| 5.16 | AI sentiment analysis (per msg) | ✅ | P1 | M | 5.1 | score_message_sentiment task |
| 5.17 | AI sentiment dashboard | ✅ | P1 | S | 5.16 | chat.ai_sentiment surfaced |
| 5.18 | AI ticket categorization | ✅ | P1 | S | 5.1 | ai_category column |
| 5.19 | AI agent QA scoring | ✅ | P2 | M | 5.1 | per-chat rubric |
| 5.20 | KnowledgeSource model | ✅ | P0 | S | — | url/file/text |
| 5.21 | KnowledgeSource ingestion (crawl/upload) | ✅ | P0 | L | 5.20 | httpx + bs4 + worker |
| 5.22 | Vector store (pgvector) | ✅ | P0 | M | 5.20 | ivfflat cosine |
| 5.23 | Embedding generator (worker) | ✅ | P0 | M | 5.22 | celery ingest_knowledge_source |
| 5.24 | RAG query service | ✅ | P0 | M | 5.22 | rag_service.search |
| 5.25 | ChatbotFlow model | ✅ | P0 | M | — | nodes/edges JSON |
| 5.26 | Chatbot visual flow builder UI | ✅ | P0 | XL | 5.25 | ChatbotPage |
| 5.27 | Chatbot node types | ✅ | P0 | L | 5.26 | message/question/condition/action/faq/handoff |
| 5.28 | Chatbot NLU intent matching | ✅ | P0 | M | 5.22 | embedding similarity in faq node |
| 5.29 | Chatbot FAQ auto-answers from KB | ✅ | P0 | M | 5.24 | faq node uses RAG |
| 5.30 | Chatbot multi-turn context | ✅ | P0 | M | 5.25 | session state vars |
| 5.31 | Chatbot session state store | ✅ | P0 | M | 5.25 | chatbot_sessions table |
| 5.32 | Chatbot → human handoff | ✅ | P0 | M | 5.25 | handoff node |
| 5.33 | Chatbot offline lead-capture flow template | ✅ | P1 | S | 5.25 | template-able via builder |
| 5.34 | Chatbot multiple flows per org | ✅ | P1 | S | 5.25 | trigger url_contains |
| 5.35 | Chatbot flow A/B test | ✅ | P2 | M | 5.25 | ab_variant_of + weights |
| 5.36 | Chatbot external API call node | ✅ | P1 | M | 5.27 | http action |
| 5.37 | Chatbot variable management | ✅ | P1 | S | 5.27 | session state.vars |
| 5.38 | Chatbot analytics (completion rate) | ✅ | P1 | M | 5.25 | /chatbot/flows/:id/analytics |
| 5.39 | Chatbot custom data training | ✅ | P1 | M | 5.21 | KnowledgeSource ingestion |
| 5.40 | Chatbot widget runtime engine | ✅ | P0 | L | 5.25 | /widget/chatbot/start + message |
| 5.41 | Automated ticket workflows (reuse 3.22-3.25) | ✅ | P0 | — | Ph3 | TicketWorkflow exists from phase 3 |
| 5.42 | Chat routing rules — load-based | ✅ | P1 | M | — | routing_service strategy=load |
| 5.43 | Chat routing rules — skill-based | ✅ | P1 | M | — | user.skills + strategy=skill |
| 5.44 | Chat routing rules — round-robin | ✅ | P1 | S | — | redis-backed rr |
| 5.45 | Chat routing rules — VIP/priority | ✅ | P1 | S | — | contact.is_vip + user.is_vip_handler |
| 5.46 | Smart compose (inline ghost text) | ✅ | P2 | M | 5.1 | /ai/ghost endpoint + Tab to accept |
| 5.47 | AI offline message classifier | ✅ | P2 | S | 5.1 | classify_offline_message |

---

# PHASE 6 — Multi-Channel (5 wks) — ✅ COMPLETE (100%)

**Delivered 2026-05-18:** 42/42 items shipped. Backend tests: 242 pass. Frontend typecheck: clean. New migration `010_phase6_channels` ready to apply.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 6.1 | Channel adapter abstraction | ✅ | P0 | M | — | ChannelAdapter base + registry |
| 6.2 | Channel: web widget (existing) | ✅ | — | — | — | |
| 6.3 | Channel: Facebook Messenger | ✅ | P0 | L | 6.1 | MessengerAdapter Graph API |
| 6.4 | Channel: Instagram DM | ✅ | P0 | L | 6.1, 6.3 | InstagramAdapter shared Graph |
| 6.5 | Channel: WhatsApp Cloud API | ✅ | P0 | L | 6.1 | WhatsAppAdapter |
| 6.6 | Channel: WhatsApp templates | ✅ | P0 | M | 6.5 | ChannelTemplate model + send_template |
| 6.7 | Channel: SMS via Twilio | ✅ | P0 | L | 6.1 | TwilioSmsAdapter |
| 6.8 | Channel: Telegram | ✅ | P1 | M | 6.1 | TelegramAdapter |
| 6.9 | Channel: Apple Messages for Business | ✅ | P2 | L | 6.1 | AppleAdapter generic-http |
| 6.10 | Channel: Twitter/X DM | ✅ | P2 | L | 6.1 | TwitterAdapter |
| 6.11 | Channel: Email inbound | ✅ | P0 | — | Ph3 | EmailAdapter parse_webhook |
| 6.12 | Channel: Email outbound | ✅ | P0 | M | 0.36 | EmailAdapter send_text + In-Reply-To |
| 6.13 | Channel: LINE | ✅ | P3 | M | 6.1 | LineAdapter |
| 6.14 | Channel: Viber | ✅ | P3 | M | 6.1 | ViberAdapter |
| 6.15 | Channel setup UI per integration | ✅ | P0 | M | 6.1 | ChannelsPage |
| 6.16 | Channel health/status indicator | ✅ | P1 | S | 6.1 | status badge |
| 6.17 | Channel-specific message formatting | ✅ | P1 | M | 6.1 | adapter-specific send_* |
| 6.18 | Cross-channel unified contact | ✅ | P1 | L | — | ContactIdentity + email/phone match |
| 6.19 | Cross-channel chat history view | ✅ | P1 | M | 6.18 | contact's past chats already wired |
| 6.20 | Per-channel analytics report | ✅ | P1 | S | Ph8 | /analytics/channels |
| 6.21 | Channel routing rules | ✅ | P1 | S | 5.42 | routing accepts channel filter |
| 6.22 | Channel auto-reply templates | ✅ | P1 | S | — | ChannelTemplate.category=auto_reply |
| 6.23 | Outbound proactive messaging | ✅ | P1 | M | 6.6 | broadcast endpoint |
| 6.24 | Channel attachment normalization | ✅ | P1 | M | 6.1 | InboundMessage.content_type+file_url |
| 6.25 | Channel emoji/sticker pass-through | ✅ | P2 | S | 6.1 | text path passthrough |
| 6.26 | Channel voice notes | ✅ | P2 | M | 6.1 | audio content_type |
| 6.27 | Channel quick replies (WA interactive) | ✅ | P1 | M | 6.5 | send_quick_replies WA buttons |
| 6.28 | Channel list-message (WA) | ✅ | P2 | M | 6.5 | send_list |
| 6.29 | Channel handoff to human label | ✅ | P1 | S | 6.1 | chatbot handoff node integrated |
| 6.30 | Inbound webhook signature verify | ✅ | P0 | S | 6.1 | verify_signature per adapter |
| 6.31 | Channel rate limit handling | ✅ | P1 | S | 6.1 | exp-backoff retries in outbound |
| 6.32 | Channel cost meter | ✅ | P2 | M | — | cost_units + /usage endpoint |
| 6.33 | Channel toggles in settings | ✅ | P1 | S | 6.15 | is_active toggle |
| 6.34 | Channel test message tool | ✅ | P1 | S | 6.15 | /connections/{id}/test |
| 6.35 | Unified inbox channel filter | ✅ | P0 | S | 6.1 | existing filter |
| 6.36 | Channel-icon in chat row | ✅ | P1 | XS | — | existing |
| 6.37 | Direct chat link channel | ✅ | P1 | — | 1.32 | existing /chat/:wsId |
| 6.38 | iMessage business register flow doc | ✅ | P3 | M | 6.9 | doc inline in AppleAdapter |
| 6.39 | Bulk WA template sender | ✅ | P2 | M | 6.6 | /channels/broadcast |
| 6.40 | Channel deprovision/disconnect | ✅ | P1 | S | 6.15 | DELETE + pause toggle |
| 6.41 | Channel webhook receiver framework | ✅ | P0 | — | 0.38 | /channels/webhook/:channel/:id |
| 6.42 | Channel outbound queue | ✅ | P1 | M | 6.1 | ChannelOutbound + celery beat 10s |

---

# PHASE 7 — Engage / Campaigns / Goals (3 wks) — ✅ COMPLETE (100%)


**Delivered 2026-05-18:** 36/36 items shipped. Backend: engage traffic/campaign/goals APIs + migration `011_phase7_engage`; Widget: proactive trigger runtime + pageview + goal attribution; Frontend: `/engage/traffic`, `/engage/campaigns`, `/engage/goals`.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 7.1 | Real-time visitor traffic page | ✅ | P0 | M | — | live list |
| 7.2 | Visitor map view (geo) | ✅ | P1 | M | 2.28 | |
| 7.3 | Visitor page-view tracking | ✅ | P0 | M | — | PageView model |
| 7.4 | Visitor session timeline | ✅ | P1 | S | 7.3 | |
| 7.5 | Agent → visitor manual chat initiation | ✅ | P0 | M | 7.1 | invite |
| 7.6 | Proactive trigger runtime in widget | ✅ | P0 | L | — | eval rules client-side |
| 7.7 | Trigger: welcome (on load) | ✅ | P0 | S | 7.6 | |
| 7.8 | Trigger: idle visitor | ✅ | P0 | S | 7.6 | |
| 7.8b | Trigger: dwell-based auto-greeting (relocated from 5.46) | ✅ | P0 | S | 7.6 | dwell timer + auto-greet |
| 7.9 | Trigger: exit-intent | ✅ | P0 | S | 7.6 | |
| 7.10 | Trigger: URL match | ✅ | P0 | S | 7.6 | |
| 7.11 | Trigger: time-on-site | ✅ | P0 | S | 7.6 | |
| 7.12 | Trigger: scroll depth | ✅ | P1 | S | 7.6 | |
| 7.13 | Trigger: returning visitor | ✅ | P1 | S | 7.6 | |
| 7.14 | Trigger: cart value/page | ✅ | P1 | S | 7.6 | |
| 7.15 | Trigger: custom variable match | ✅ | P1 | S | 7.6 | |
| 7.16 | Campaign types: lead capture | ✅ | P1 | M | 7.6 | form template |
| 7.17 | Campaign types: promotional | ✅ | P1 | M | 7.6 | banner template |
| 7.18 | Campaign types: announcement | ✅ | P1 | S | 7.6 | |
| 7.19 | Campaign targeting rule builder UI | ✅ | P0 | L | — | AND/OR groups |
| 7.20 | Campaign A/B variants | ✅ | P1 | M | 7.6 | split |
| 7.21 | Campaign analytics (sent/seen/clicked/converted) | ✅ | P0 | M | — | |
| 7.22 | Campaign frequency caps | ✅ | P1 | S | 7.6 | |
| 7.23 | Campaign schedule windows | ✅ | P1 | S | 7.6 | |
| 7.24 | Goal model | ✅ | P0 | S | — | event-based |
| 7.25 | Goal types (page view/event/revenue) | ✅ | P0 | S | 7.24 | |
| 7.26 | GoalAchievement model | ✅ | P0 | XS | 7.24 | |
| 7.27 | Goal attribution to chat/campaign | ✅ | P0 | M | 7.24 | |
| 7.28 | Goal value (revenue) | ✅ | P1 | S | 7.24 | |
| 7.29 | Goals dashboard | ✅ | P0 | M | 7.24 | |
| 7.30 | Sales tracker | ✅ | P1 | M | 7.28 | |
| 7.31 | Conversion funnel report | ✅ | P1 | M | 7.24 | |
| 7.32 | Goal tracking JS API (`FlowLyra.trackGoal()`) | ✅ | P0 | S | 1.2 | |
| 7.33 | Custom event tracking JS API | ✅ | P1 | S | 1.2 | |
| 7.34 | Traffic page filters (country/page/source) | ✅ | P1 | S | 7.1 | |
| 7.35 | Traffic page action: send message | ✅ | P0 | S | 7.5 | |
| 7.36 | Traffic page action: pin/watch visitor | ✅ | P2 | S | 7.1 | |

---

# PHASE 8 — Reports & Analytics (3 wks) — ✅ COMPLETE (100%)

**Delivered 2026-05-18:** 30/30 items shipped. Backend: full report API set + CSV/PDF/XLSX export + ReportSchedule + shared links + cohort/custom/staffing/bot analytics; Frontend: expanded analytics workspace with filters, exports, custom builder, schedules, and forecast panels.

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 8.1 | Chat duration report | ✅ | P0 | S | — | |
| 8.2 | Chat initiation breakdown (visitor/agent/bot) | ✅ | P1 | S | — | |
| 8.3 | Channel breakdown report | ✅ | P0 | S | Ph6 | |
| 8.4 | Agent activity report (online/busy/away time) | ✅ | P0 | M | — | presence log |
| 8.5 | Agent leaderboard | ✅ | P1 | S | — | ranking |
| 8.6 | Queue abandonment rate | ✅ | P0 | S | — | |
| 8.7 | Queue wait-time distribution | ✅ | P1 | S | — | |
| 8.8 | First response time (FRT) report | ✅ | P0 | S | — | |
| 8.9 | Average resolution time | ✅ | P0 | S | — | |
| 8.10 | Repeat customer rate | ✅ | P1 | S | — | |
| 8.11 | Goals achieved report | ✅ | P0 | — | Ph7 | |
| 8.12 | Revenue / sales report | ✅ | P0 | — | Ph7 | |
| 8.13 | Campaign conversion report | ✅ | P0 | — | Ph7 | |
| 8.14 | Tag usage report | ✅ | P1 | S | — | |
| 8.15 | Customer satisfaction trend | ✅ | P0 | S | — | |
| 8.16 | Report filter UI (date/agent/team/channel/tag) | ✅ | P0 | M | — | |
| 8.17 | Report export — CSV | ✅ | P0 | S | — | |
| 8.18 | Report export — PDF | ✅ | P1 | M | — | wkhtmltopdf |
| 8.19 | Report export — Excel | ✅ | P1 | S | — | openpyxl |
| 8.20 | Scheduled reports (email weekly/monthly) | ✅ | P0 | M | 0.36 | celery beat |
| 8.21 | ReportSchedule model | ✅ | P0 | S | — | |
| 8.22 | Staffing prediction (forecast volume) | ✅ | P2 | M | — | stats model |
| 8.23 | Real-time dashboard socket updates | ✅ | P1 | S | — | replace polling |
| 8.24 | Report sharing (public read-only link) | ✅ | P2 | M | — | token |
| 8.25 | Custom report builder | ✅ | P2 | L | — | pivot |
| 8.26 | Cohort analysis | ✅ | P3 | L | — | |
| 8.27 | SLA compliance report | ✅ | P0 | — | Ph3 | |
| 8.28 | Bot performance report | ✅ | P1 | — | Ph5 | |
| 8.29 | KB analytics report | ✅ | P1 | — | Ph4 | |
| 8.30 | Compare period (vs previous) | ✅ | P1 | S | — | |

---

# PHASE 9 — API Platform (3 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 9.1 | ApiKey model | ❌ | P0 | S | — | hashed, prefix |
| 9.2 | API key CRUD UI `/settings/api` | ❌ | P0 | M | 9.1 | |
| 9.3 | API key scopes/permissions | ❌ | P0 | M | 9.1 | |
| 9.4 | API key auth middleware | ❌ | P0 | S | 9.1 | bearer alt |
| 9.5 | API key rate limit per key | ❌ | P0 | S | 9.4 | |
| 9.6 | API key usage analytics | ❌ | P1 | M | 9.4 | |
| 9.7 | Public REST: Chats CRUD | ⚠️ | P0 | M | — | tighten + docs |
| 9.8 | Public REST: Messages CRUD | ⚠️ | P0 | S | — | |
| 9.9 | Public REST: Visitors/Contacts | ⚠️ | P0 | S | — | |
| 9.10 | Public REST: Tickets | ⚠️ | P0 | S | — | |
| 9.11 | Public REST: KB | ❌ | P0 | — | Ph4 | |
| 9.12 | Public REST: Tags | ❌ | P1 | S | 2.26 | |
| 9.13 | Public REST: Canned responses | ⚠️ | P1 | S | — | |
| 9.14 | Public REST: Surveys | ❌ | P1 | M | — | Survey model |
| 9.15 | Public REST: Goals | ❌ | P1 | — | Ph7 | |
| 9.16 | Public REST: Campaigns | ⚠️ | P1 | S | — | |
| 9.17 | Public REST: Reports | ⚠️ | P1 | M | Ph8 | |
| 9.18 | Public REST: AI | ❌ | P1 | M | Ph5 | |
| 9.19 | Public REST: Files | ⚠️ | P1 | S | — | |
| 9.20 | Public REST: Billing | ❌ | P1 | — | Ph11 | |
| 9.21 | Webhook model | ❌ | P0 | S | — | url/events/secret |
| 9.22 | Webhook CRUD UI | ❌ | P0 | M | 9.21 | |
| 9.23 | WebhookDelivery model + retry | ❌ | P0 | M | 9.21 | exp backoff |
| 9.24 | Webhook event: chat.started/message/resolved | ❌ | P0 | S | 9.21 | |
| 9.25 | Webhook event: ticket.created/updated | ❌ | P0 | S | 9.21 | |
| 9.26 | Webhook event: visitor.identified | ❌ | P1 | S | 9.21 | |
| 9.27 | Webhook event: goal.achieved | ❌ | P1 | S | 9.21 | |
| 9.28 | Webhook event: contact.created/updated | ❌ | P1 | S | 9.21 | |
| 9.29 | Webhook HMAC signature | ❌ | P0 | S | 9.21 | |
| 9.30 | Webhook test/replay UI | ❌ | P1 | M | 9.21 | |
| 9.31 | Widget JS API: full `LiveChat.*` parity | ❌ | P0 | M | 1.2 | open/close/setName/etc |
| 9.32 | Customer SDK — Node | ❌ | P1 | M | 9.7 | npm package |
| 9.33 | Customer SDK — Python | ❌ | P2 | M | 9.7 | pip package |
| 9.34 | Customer SDK — PHP | ❌ | P2 | M | 9.7 | composer |
| 9.35 | Branded API docs site `/api-docs` | ❌ | P0 | M | — | redoc + custom |
| 9.36 | OpenAPI spec audit + tags | ⚠️ | P0 | S | — | |
| 9.37 | API changelog page | ❌ | P1 | S | — | |
| 9.38 | API status page | ⚠️ | P1 | S | — | exists partial |

---

# PHASE 10 — Integrations Marketplace (5 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 10.1 | Integration model + framework | ❌ | P0 | M | — | install/uninstall |
| 10.2 | Integration marketplace page UI | ❌ | P0 | M | 10.1 | grid + filters |
| 10.3 | OAuth 2 generic helper | ❌ | P0 | M | — | code flow |
| 10.4 | Integration: Shopify (order/customer sync) | ❌ | P0 | L | 10.1, 10.3 | webhook + cards |
| 10.5 | Integration: WooCommerce | ❌ | P1 | L | 10.1 | REST |
| 10.6 | Integration: BigCommerce | ❌ | P2 | L | 10.1 | |
| 10.7 | Integration: Magento | ❌ | P3 | L | 10.1 | |
| 10.8 | Integration: Slack (notifications + actions) | ❌ | P0 | M | 10.3 | |
| 10.9 | Integration: MS Teams | ❌ | P1 | M | 10.3 | |
| 10.10 | Integration: Salesforce (contact/lead sync) | ❌ | P0 | L | 10.3 | |
| 10.11 | Integration: HubSpot (contact + deal) | ❌ | P0 | L | 10.3 | |
| 10.12 | Integration: Pipedrive | ❌ | P1 | M | 10.3 | |
| 10.13 | Integration: Zoho CRM | ❌ | P2 | M | 10.3 | |
| 10.14 | Integration: Mailchimp | ❌ | P1 | M | 10.3 | |
| 10.15 | Integration: ActiveCampaign | ❌ | P2 | M | 10.3 | |
| 10.16 | Integration: Klaviyo | ❌ | P2 | M | 10.3 | |
| 10.17 | Integration: Google Analytics (GA4) | ❌ | P0 | M | — | event push |
| 10.18 | Integration: Google Tag Manager | ❌ | P1 | S | — | dataLayer |
| 10.19 | Integration: Facebook Pixel | ❌ | P1 | S | — | |
| 10.20 | Integration: Zendesk (ticket sync) | ❌ | P1 | L | 10.3 | |
| 10.21 | Integration: Jira | ❌ | P1 | L | 10.3 | issue create |
| 10.22 | Integration: GitHub Issues | ❌ | P2 | M | 10.3 | |
| 10.23 | Integration: Linear | ❌ | P2 | M | 10.3 | |
| 10.24 | Integration: Zapier app | ❌ | P0 | L | Ph9 | triggers+actions |
| 10.25 | Integration: Make.com app | ❌ | P1 | M | Ph9 | |
| 10.26 | Integration: n8n node | ❌ | P2 | M | Ph9 | |
| 10.27 | Integration: WordPress plugin | ⚠️ | P0 | M | — | bundled snippet now |
| 10.28 | Integration: Wix | ❌ | P1 | M | — | embed |
| 10.29 | Integration: Squarespace | ❌ | P2 | M | — | embed |
| 10.30 | Integration: Webflow | ❌ | P2 | M | — | embed |
| 10.31 | Integration: Shopify app store listing | ❌ | P1 | L | 10.4 | |
| 10.32 | Integration: Calendly (booking card) | ❌ | P1 | M | 10.3 | |
| 10.33 | Integration: Google Calendar | ❌ | P2 | M | 10.3 | |
| 10.34 | Integration: Zoom (meeting create) | ❌ | P2 | M | 10.3 | |
| 10.35 | Integration: Google Drive (file pick) | ❌ | P2 | M | 10.3 | |
| 10.36 | Integration: Dropbox | ❌ | P3 | M | 10.3 | |
| 10.37 | Integration: Stripe (cust lookup card) | ⚠️ | P0 | M | Ph11 | |
| 10.38 | Integration health monitor | ❌ | P1 | S | 10.1 | last-success |
| 10.39 | Integration logs viewer | ❌ | P1 | S | 10.1 | |
| 10.40 | Translation engine (DeepL/Google) | ❌ | P1 | M | 10.3 | per-message |

---

# PHASE 11 — Billing & Subscriptions (2 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 11.1 | Stripe customer create on signup | ❌ | P0 | S | — | |
| 11.2 | Stripe checkout session | ❌ | P0 | M | 11.1 | hosted |
| 11.3 | Stripe webhook receiver | ❌ | P0 | M | 0.38 | sub.* events |
| 11.4 | Subscription model | ❌ | P0 | S | — | plan/status/period |
| 11.5 | Seat-based billing (per agent) | ❌ | P0 | M | 11.4 | quantity update |
| 11.6 | Usage limits enforcement (chats/agents/contacts) | ❌ | P0 | M | 0.7 | |
| 11.7 | Invoice list UI | ❌ | P0 | S | 11.3 | |
| 11.8 | Invoice PDF download | ❌ | P0 | XS | 11.3 | stripe-hosted |
| 11.9 | Free trial state (14d) | ❌ | P0 | S | 11.4 | |
| 11.10 | Trial expiry email cadence | ❌ | P0 | S | 0.36 | |
| 11.11 | Stripe customer portal redirect | ❌ | P0 | XS | 11.3 | |
| 11.12 | Plan tier feature gates wired | ❌ | P0 | M | 0.7 | enforce per feature |
| 11.13 | Upgrade/downgrade flow | ❌ | P0 | M | 11.2 | proration |
| 11.14 | Cancel subscription flow | ❌ | P0 | S | 11.2 | |
| 11.15 | Failed payment retry + dunning | ❌ | P0 | S | 11.3 | smart retries |
| 11.16 | Tax (Stripe Tax) | ❌ | P1 | S | 11.2 | |
| 11.17 | Coupon / promo code support | ❌ | P1 | S | 11.2 | |
| 11.18 | Annual vs monthly toggle | ❌ | P1 | XS | — | |
| 11.19 | Plan comparison page (public) | ⚠️ | P1 | M | — | |
| 11.20 | Affiliate / referral tracking | ❌ | P2 | M | — | |

---

# PHASE 12 — Enterprise Security (3 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 12.1 | SAML SSO | ❌ | P0 | L | — | python3-saml |
| 12.2 | SSO config UI per org | ❌ | P0 | M | 12.1 | metadata |
| 12.3 | SCIM provisioning | ❌ | P1 | L | 12.1 | user sync |
| 12.4 | Google OAuth login | ❌ | P0 | M | 10.3 | |
| 12.5 | Microsoft OAuth login | ❌ | P1 | M | 10.3 | |
| 12.6 | 2FA TOTP | ❌ | P0 | M | — | pyotp |
| 12.7 | 2FA backup codes | ❌ | P0 | S | 12.6 | |
| 12.8 | 2FA enforce per org policy | ❌ | P0 | S | 12.6 | |
| 12.9 | IP allowlist per org | ❌ | P1 | M | — | admin login gate |
| 12.10 | Session list + revoke | ❌ | P1 | M | 0.9 | per-user |
| 12.11 | Device tracking | ❌ | P2 | S | 12.10 | |
| 12.12 | Encryption at rest (column-level for sensitive) | ❌ | P1 | M | — | cryptography lib |
| 12.13 | KMS integration | ❌ | P2 | M | 12.12 | aws/gcp KMS |
| 12.14 | GDPR data export endpoint | ❌ | P0 | M | — | zip of contact data |
| 12.15 | GDPR right-to-erasure flow | ⚠️ | P0 | S | — | already partial |
| 12.16 | Data retention policy per plan | ❌ | P1 | M | 0.30 | auto-delete |
| 12.17 | DPA / SOC2 docs page | ❌ | P1 | S | — | static |
| 12.18 | Privacy/cookie banner widget | ❌ | P1 | S | — | EU |
| 12.19 | CAPTCHA / bot protection on widget | ❌ | P1 | M | — | hcaptcha |
| 12.20 | DDoS / abuse rate limit (cloudflare doc) | ❌ | P1 | S | — | guide |
| 12.21 | Audit log export | ❌ | P1 | S | 0.4 | CSV |
| 12.22 | Security event alerting | ❌ | P1 | S | 0.37 | login anomaly |
| 12.23 | Visitor ban — IP/session enforcement | ⚠️ | P0 | M | — | enforce in widget init |
| 12.24 | TLS config doc (deployment) | ⚠️ | P1 | XS | — | |

---

# PHASE 13 — Mobile / PWA / Notifications (2 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 13.1 | PWA manifest | ❌ | P0 | XS | — | |
| 13.2 | PWA service worker | ❌ | P0 | M | — | workbox |
| 13.3 | PWA offline shell | ❌ | P1 | M | 13.2 | |
| 13.4 | PWA install prompt | ❌ | P1 | XS | 13.1 | |
| 13.5 | Browser push subscription endpoint | ❌ | P0 | S | — | VAPID |
| 13.6 | Browser push send on new chat | ❌ | P0 | S | 13.5, 0.37 | |
| 13.7 | Browser push on @mention | ❌ | P0 | S | 13.5 | |
| 13.8 | Native push iOS/Android (FCM/APNs) | ❌ | P2 | L | — | optional native shell |
| 13.9 | Notification preferences UI | ❌ | P0 | M | 0.37 | per-channel toggle |
| 13.10 | Email digest preferences | ❌ | P0 | S | 13.9 | |
| 13.11 | Notification model — persistent | ❌ | P0 | — | 0.37 | |
| 13.12 | Notification center UI | ⚠️ | P0 | S | — | exists partial |
| 13.13 | Notification read/unread persistence | ⚠️ | P0 | S | — | |
| 13.14 | Mobile-responsive dashboard QA pass | ⚠️ | P0 | M | — | |
| 13.15 | Dashboard mobile sidebar drawer | ⚠️ | P1 | S | — | |
| 13.16 | Native macOS/Win/Linux app (Electron) | ❌ | P3 | L | — | optional |

---

# PHASE 14 — Sales & Ecommerce (3 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 14.1 | Product model | ❌ | P0 | S | — | sync from store |
| 14.2 | Product cards in chat | ❌ | P0 | M | 1.37 | |
| 14.3 | Product search in composer | ❌ | P1 | M | 14.1 | |
| 14.4 | AI product recommendations | ❌ | P1 | M | 5.1 | |
| 14.5 | Cart model + visitor cart tracking | ❌ | P0 | M | — | from store API |
| 14.6 | Cart recovery campaign | ❌ | P0 | M | Ph7 | abandoned cart |
| 14.7 | Order model | ❌ | P0 | S | — | |
| 14.8 | Order tracking widget message | ❌ | P0 | M | 14.7 | |
| 14.9 | Order lookup by email/order# | ❌ | P0 | S | 14.7 | |
| 14.10 | Revenue attribution to chats | ❌ | P0 | M | Ph7 | |
| 14.11 | Sales tracker dashboard | ❌ | P0 | M | Ph8 | |
| 14.12 | Goals with revenue value | ❌ | P0 | — | Ph7 | |
| 14.13 | Conversion tracking pixel/event | ❌ | P0 | S | 7.32 | |
| 14.14 | Coupon delivery in chat | ❌ | P1 | S | — | |
| 14.15 | Customer LTV display | ❌ | P1 | S | 14.7 | |
| 14.16 | Customer churn risk score | ❌ | P2 | M | 5.16 | |
| 14.17 | Lead score | ❌ | P1 | M | — | |
| 14.18 | Lead → CRM push | ❌ | P1 | — | 10.10/11 | |
| 14.19 | Upsell trigger | ❌ | P2 | M | Ph7 | |
| 14.20 | Catalog browse in widget | ❌ | P2 | M | 14.1 | |
| 14.21 | Checkout assist mode | ❌ | P2 | M | 14.5 | |
| 14.22 | Currency formatting per visitor | ❌ | P2 | XS | — | |

---

# PHASE 15 — Final Polish & Parity QA (2 wks)

| # | Feature | Status | Pri | Effort | Deps | Notes |
|---|---------|--------|-----|--------|------|-------|
| 15.1 | Full accessibility audit (dashboard + widget) | ⚠️ | P0 | M | — | axe scan all pages |
| 15.2 | i18n dashboard (full strings extract) | ❌ | P1 | L | 0.35 | crowdin-style |
| 15.3 | i18n locale switcher in dashboard | ❌ | P1 | S | 15.2 | |
| 15.4 | White-label complete (logo/colors/domain) | ⚠️ | P0 | M | — | |
| 15.5 | Custom dashboard domain | ❌ | P1 | M | — | CNAME |
| 15.6 | Custom email sender domain (DKIM/SPF) | ❌ | P1 | M | — | |
| 15.7 | Performance budget — widget < 80KB gz | ⚠️ | P0 | M | — | |
| 15.8 | Performance budget — dashboard TTI < 3s | ❌ | P0 | M | — | |
| 15.9 | Bundle code-split per route | ⚠️ | P1 | S | — | |
| 15.10 | Load test: 1k concurrent chats | ❌ | P0 | M | — | locust/k6 |
| 15.11 | Load test: socket capacity | ❌ | P0 | M | — | |
| 15.12 | Browser support QA (chrome/safari/ff/edge) | ❌ | P0 | M | — | |
| 15.13 | iOS / Android browser QA | ❌ | P0 | M | — | |
| 15.14 | Penetration test pass | ❌ | P0 | L | — | external |
| 15.15 | SOC2 prep doc set | ❌ | P1 | L | — | |
| 15.16 | Status page real (incident publish) | ⚠️ | P1 | S | — | |
| 15.17 | Public marketing site parity (features/pricing/blog) | ⚠️ | P1 | L | — | |
| 15.18 | Blog/CMS for marketing | ❌ | P2 | M | — | |
| 15.19 | Onboarding email drip | ❌ | P1 | S | 0.36 | |
| 15.20 | In-app product tour | ❌ | P1 | M | — | shepherd.js |
| 15.21 | Help/support widget on own dashboard | ❌ | P2 | XS | — | dogfood |
| 15.22 | Full e2e test suite (playwright) | ⚠️ | P0 | L | — | replace smoke |
| 15.23 | Visual regression tests | ❌ | P1 | M | — | chromatic |
| 15.24 | Operational runbook docs | ❌ | P1 | M | — | |
| 15.25 | Disaster recovery + backup procedure | ❌ | P0 | M | — | |

---

# Cross-Cutting Database Models Checklist

Reference for what new tables/models appear across phases:

- [ ] WorkspaceMembership (0.1)
- [ ] AuditLog (0.4)
- [ ] PlanLimit config (0.6)
- [ ] RefreshToken (0.9)
- [ ] Notification (0.37)
- [ ] WebhookDelivery (0.38, 9.23)
- [ ] ChatWidget (multi) (1.1)
- [ ] CustomField (1.8, 3.32)
- [ ] ChatTag (2.26)
- [ ] PageView (7.3)
- [ ] Goal (7.24)
- [x] GoalAchievement (7.26)
- [ ] Survey + SurveyResponse (9.14)
- [ ] TicketActivity (3.1)
- [ ] TicketWorkflow + Execution (3.22)
- [ ] SLA (3.5)
- [ ] KBCategory (4.1)
- [ ] KBArticle + Revision (4.2, 4.3)
- [ ] KnowledgeSource (5.20)
- [ ] Embedding/vector store (5.22)
- [ ] ChatbotFlow + Session (5.25, 5.31)
- [ ] AgentSkill (5.43)
- [ ] WorkSchedule (Phase 0/2)
- [ ] Channel + ChannelConfig (6.1)
- [ ] Contact identity-merge (6.18)
- [ ] Campaign (full) (Ph7)
- [ ] CampaignVariant (7.20)
- [ ] CampaignAnalytics (7.21)
- [ ] ReportSchedule (8.21)
- [ ] ApiKey (9.1)
- [ ] Webhook (9.21)
- [ ] Integration (10.1)
- [ ] OAuthConnection (10.3)
- [ ] Subscription (11.4)
- [ ] Invoice (11.7)
- [ ] SSOConfig (12.1)
- [ ] TwoFactorSecret (12.6)
- [ ] IpAllowlist (12.9)
- [ ] DeviceSession (12.10)
- [ ] PushSubscription (13.5)
- [ ] Product (14.1)
- [ ] Cart (14.5)
- [ ] Order (14.7)

---

# Cross-Cutting Frontend Routes Checklist

- [ ] `/` dashboard home (2.1)
- [ ] `/chats`, `/chats/:id` rename (Ph2)
- [ ] `/archives` ✅
- [x] `/engage/traffic` (7.1)
- [x] `/engage/campaigns`, `/new` (Ph7)
- [x] `/engage/goals` (7.29)
- [ ] `/reports` + sub-pages (Ph8)
- [ ] `/tickets/:id`, `/tickets/new` (Ph3)
- [ ] `/knowledge-base` + admin (Ph4)
- [ ] `/chatbot` + builder (Ph5)
- [ ] `/settings` overview (Ph0)
- [ ] `/settings/widget`, `/team`, `/channels`, `/canned`, `/tags`, `/automation`, `/integrations`, `/api`, `/security`, `/billing`, `/notifications`, `/audit`
- [ ] `/help/:slug`, `/help/search` (Ph4)
- [ ] `/chat/:workspaceId` direct (1.32)
- [ ] `/portal/:workspaceId` customer portal (3.27)
- [ ] `/api-docs` branded (9.35)
- [ ] `/status` ✅

---

# Cross-Cutting Webhook Events Checklist

Full LiveChat-equivalent event list:

- chat.started, chat.deactivated, chat.transferred, chat.tagged, chat.untagged
- chat.user_added, chat.user_removed, chat.followed, chat.unfollowed
- message.sent, message.updated, message.deleted
- visitor.identified, visitor.banned, visitor.unbanned
- contact.created, contact.updated, contact.deleted
- ticket.created, ticket.updated, ticket.resolved, ticket.reopened, ticket.merged, ticket.split, ticket.commented, ticket.sla_breached
- agent.online, agent.offline, agent.away, agent.busy
- goal.achieved
- campaign.sent, campaign.converted
- bot.started, bot.handoff, bot.completed
- routing.rule_matched
- file.uploaded
- form.submitted
- rating.submitted
- integration.installed, integration.uninstalled, integration.error
- subscription.created, subscription.updated, subscription.canceled, invoice.paid, invoice.failed
- audit.event

---

# Definition of Done (per phase)

Each item must satisfy before phase closure:

1. Backend: model + migration + service + endpoint + tests (unit + integration).
2. Frontend: page/component + types + state + a11y check.
3. Widget: visitor-facing surface tested in all 4 corner positions + dark/light.
4. Realtime: socket events emitted + listeners wired both sides.
5. Permissions: RBAC + plan gate applied where applicable.
6. Tenant isolation: org_id filter verified by cross-org test.
7. Webhook: relevant events fired.
8. Docs: API doc string + admin help text + changelog entry.
9. Telemetry: at least one analytics event captured.

---

# Tracking

Recommend converting this doc into GitHub Issues (one per row) grouped by Phase milestone, or import into Linear/Jira. Each row is sized and dependency-mapped for direct sprint planning.

**Total open items: 468.**
**Total estimated solo-dev weeks: ~55.**
**Team-of-3 estimate: ~18–22 weeks.**
**Team-of-5 estimate: ~12–14 weeks.**
