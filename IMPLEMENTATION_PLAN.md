# FlowLyra — Design Implementation Plan

> Pixel-accurate implementation of every page/component to match `design.md`.
> **Rule:** Complete each item fully, verify, then mark ✅. Never skip.

---

## Status Legend
- ⬜ Not started
- 🔄 In progress
- ✅ Complete

---

## PHASE 1 — Design System & Base Components

| # | Task | Status |
|---|------|--------|
| 1.1 | **index.css** — Verify all CSS vars, chat bubbles, scrollbar, skeleton, marquee, gradient-text, glass, launcher-pulse, page-enter animation | ✅ |
| 1.2 | **tailwind.config.js** — Add missing shadows (xs), missing font sizes (2xs), verify all brand/navy/semantic tokens | ✅ |
| 1.3 | **Button.tsx** — Fix to match spec: `rounded-md` not `rounded-xl`, `font-medium` not `font-bold`, add `outline-brand` + `link` variants, fix hover `-translate-y-px`, fix focus ring | ✅ |
| 1.4 | **Input.tsx** — Match spec: border `border-navy-100`, focus ring `ring-brand-500/30`, left/right icon addon, error state, dark mode | ✅ |
| 1.5 | **Select.tsx** — Match spec: trigger same as input + chevron, options dropdown with shadow-soft, group labels, max-h-60 overflow | ✅ |
| 1.6 | **Badge.tsx** — All variants: default, brand, success, warning, danger, purple, pill, dot variants | ✅ |
| 1.7 | **Avatar.tsx** — All sizes xs/sm/md/lg/xl, status dot positioning, image support | ✅ |
| 1.8 | **Card.tsx** — Standard, Elevated (marketing), Dark variants with correct hover states | ✅ |
| 1.9 | **Modal.tsx** — Backdrop blur, scale-in animation, header/body/footer structure, correct sizing | ✅ |
| 1.10 | **Drawer/Sheet.tsx** — Slide-in-right animation, header/body/footer, correct z-index | ✅ |
| 1.11 | **Tooltip.tsx** — Correct positioning, arrow, fade-in, z-tooltip, 300ms delay | ✅ |
| 1.12 | **Toast.tsx** — Correct layout, icon colors, progress bar, slide-in-right animation | ✅ |
| 1.13 | **Table.tsx** — Header bg, cell padding, row hover, selected state, sticky header support | ✅ |
| 1.14 | **Tabs.tsx** — Border-bottom container, active brand border, correct font weights | ✅ |
| 1.15 | **Skeleton.tsx** — Shimmer animation using CSS vars, all size variants | ✅ |
| 1.16 | **EmptyState.tsx** — Correct icon size, typography, spacing | ✅ |
| 1.17 | **Spinner.tsx** — SVG stroke-based, correct sizes sm/md/lg | ✅ |
| 1.18 | **Toggle.tsx** — Match spec: w-14 h-7, knob transition cubic-bezier, correct colors | ✅ |
| 1.19 | **StatusDot.tsx** — All status colors, pulse animation for busy/in-chat | ✅ |
| 1.20 | **index.ts** — Barrel exports all components | ✅ |

---

## PHASE 2 — Global Navbar + Footer (Public)

| # | Task | Status |
|---|------|--------|
| 2.1 | **PublicNavbar** — Sticky top, h-16, backdrop-blur, logo with mark, nav links, dropdown panels, CTA buttons, mobile hamburger panel | ✅ |
| 2.2 | **AnnouncementBar** — h-9, brand-500 bg, dismissable | ✅ |
| 2.3 | **PublicFooter** — 5-column grid, link sections, bottom bar with social icons, copyright | ✅ |

---

## PHASE 3 — Public Marketing Pages

| # | Task | Status |
|---|------|--------|
| 3.1 | **HomePage** — Hero (badge, headline, CTA group, social proof marquee), Feature sections (alternating layout), AI section, Integrations grid, Testimonials, CTA section | ✅ |
| 3.2 | **PricingPage** — Toggle monthly/annual, 4 pricing cards (Starter/Team/Business/Enterprise), comparison table, FAQ accordion | ✅ |
| 3.3 | **FeaturesPage** — Hero, feature group sections with icon cards | ✅ |
| 3.4 | **IntegrationsPage** — Search, category pills, integration grid cards | ✅ |

---

## PHASE 4 — Authentication Pages

| # | Task | Status |
|---|------|--------|
| 4.1 | **LoginPage** — Split layout (brand left panel + form right), email/password inputs, social buttons, forgot link, signup link | ✅ |
| 4.2 | **SignupPage** — Same split layout, full name/email/password/company fields, password strength indicator | ✅ |
| 4.3 | **ForgotPasswordPage** — Centered card layout, 3-step progress dots | ✅ |
| 4.4 | **ResetPasswordPage** — New password + confirm, strength indicator | ✅ |

---

## PHASE 5 — Agent Dashboard Shell

| # | Task | Status |
|---|------|--------|
| 5.1 | **Sidebar** — w-64, logo, workspace switcher, all nav sections with icons, section labels, active state (brand-50 + left bar), badge counts, sub-items, user footer | ✅ |
| 5.2 | **TopHeader** — h-14, backdrop-blur, breadcrumb, search trigger (Cmd+K), notification bell with badge, user menu | ✅ |
| 5.3 | **Dashboard Home Page** — Greeting, 4-stat grid cards with trends, Recent Chats panel, Quick Actions, Performance chart (Recharts) | ✅ |

---

## PHASE 6 — Chat Inbox (3-Pane)

| # | Task | Status |
|---|------|--------|
| 6.1 | **ConversationList (left pane)** — w-80, search, filter tabs, chat items with avatar+status dot+unread badge, active state with left border | ✅ |
| 6.2 | **ChatFeed (center pane)** — Chat header, messages area (date dividers, grouped messages, bubble styles agent/visitor/bot/note), typing indicator, file/image attachments, sneak peek | ✅ |
| 6.3 | **ReplyInputArea** — AI suggestion banner, textarea with toolbar (emoji/attach/image/canned/note buttons), send button, character count | ✅ |
| 6.4 | **VisitorInfoPanel (right pane)** — Visitor details, info grid, custom fields, tags, notes, chat history, actions section | ✅ |

---

## PHASE 7 — Dashboard Pages

| # | Task | Status |
|---|------|--------|
| 7.1 | **ArchivesPage** — Filter bar (search, selects, view toggle), archived conversation list/table, row expand | ✅ |
| 7.2 | **AgentsPage** — Page header + invite button, agent table (avatar/name/email/role/status/chats), invite modal | ✅ |
| 7.3 | **TeamsPage** — Team cards grid, overlapping avatars, create team modal | ✅ |
| 7.4 | **ReportsPage** — 4 stat cards, date range picker, export button, conversations line chart, channels donut, top agents table | ✅ |
| 7.5 | **SettingsOverviewPage** — Settings cards grid (all 12 categories with icons) | ✅ |
| 7.6 | **WidgetSettingsPage** — Tabs (Appearance/Behavior/Pre-chat/Post-chat/Advanced), phone mockup preview, color/position/theme/title/avatar settings | ✅ |
| 7.7 | **NotificationPreferencesPage** — Desktop/Email/Push sections, notification type rows with toggles | ✅ |
| 7.8 | **SecurityPage** — 2FA card (QR code + TOTP), active sessions table, API keys management | ✅ |
| 7.9 | **IntegrationsMarketplacePage** — Search, category pills, integration cards with install/configure status | ✅ |

---

## PHASE 8 — Ticketing System

| # | Task | Status |
|---|------|--------|
| 8.1 | **TicketsPage** — Tabs (Open/Pending/Resolved/All), filter bar, ticket table with priority colors, new ticket button | ✅ |
| 8.2 | **TicketDetailPage** — Header (ID/subject/priority badge), meta info, thread messages, sidebar properties panel, reply/note actions | ✅ |

---

## PHASE 9 — Knowledge Base

| # | Task | Status |
|---|------|--------|
| 9.1 | **KnowledgeBasePage (Admin)** — Categories sidebar, article list table, create/edit article with rich text editor, sidebar metadata | ✅ |
| 9.2 | **PublicKBPage** — Help center header, large search, categories grid, popular articles, article detail with breadcrumb + helpfulness feedback | ✅ |

---

## PHASE 10 — Chatbot + Engage

| # | Task | Status |
|---|------|--------|
| 10.1 | **ChatbotPage** — Full-screen canvas with grid dots, node types (trigger/message/question/action/condition), node toolbar left sidebar, properties panel right sidebar | ✅ |
| 10.2 | **CampaignsPage** — Campaigns table, create campaign flow (type selection, targeting, message, schedule, goal) | ✅ |
| 10.3 | **GoalsPage** — Goals cards grid with progress bars, create goal modal | ✅ |
| 10.4 | **TrafficPage** — Real-time visitor count, active visitors list (page/duration/source/device), auto-refresh | ✅ |
| 10.5 | **TriggersPage** — Triggers table, create trigger with AND/OR rule builder | ✅ |

---

## PHASE 11 — Billing

| # | Task | Status |
|---|------|--------|
| 11.1 | **BillingPage** — Current plan card (plan name/price/usage progress bars/actions), invoice table, payment method display | ✅ |
| 11.2 | **Plan upgrade view** — Pricing card grid (same as public), current plan badge, upgrade/downgrade CTAs, Stripe Elements form | ✅ |

---

## PHASE 12 — Widget

| # | Task | Status |
|---|------|--------|
| 12.1 | **Widget Launcher** — fixed bottom-6 right-6, w-14 h-14 rounded-full, pulse animation, unread badge, tooltip on hover | ✅ |
| 12.2 | **Widget Window** — w-[380px] h-[560px], rounded-2xl, open/close animations, mobile fullscreen | ✅ |
| 12.3 | **Widget Header** — h-16, brand-500 bg, avatar+title+subtitle with green dot, close/maximize buttons, offline state (navy-700) | ✅ |
| 12.4 | **Widget Messages Area** — Agent/visitor/bot bubbles, welcome message, typing indicator, quick replies, image/file messages, carousel/rich cards | ✅ |
| 12.5 | **Widget Input** — Attachment preview chips, textarea, emoji/attach toolbar, send button, "Powered by FlowLyra" | ✅ |
| 12.6 | **Widget Pre-Chat Form** — Name/email/department/message fields, submit/skip | ✅ |
| 12.7 | **Widget Post-Chat Survey (CSAT)** — Star/scale rating, comment textarea, submit/skip | ✅ |
| 12.8 | **Widget Offline Form** — Name/email/message/department, success state | ✅ |
| 12.9 | **Widget Dark Mode** — All widget components dark variant | ✅ |

---

## PHASE 13 — Notification Center + Command Palette

| # | Task | Status |
|---|------|--------|
| 13.1 | **NotificationCenter** — Panel (absolute top-full right-0, w-96, max-h-480), header with mark-all-read, tabs (All/Unreads/Mentions), notification items with unread left bar, empty state | ✅ |
| 13.2 | **CommandPalette (Cmd+K)** — Overlay backdrop, container fixed top-20%, search input, grouped results with icons+shortcuts, keyboard navigation, footer hints | ✅ |

---

## PHASE 14 — Mobile Responsive

| # | Task | Status |
|---|------|--------|
| 14.1 | **Dashboard Mobile** — Sidebar hamburger overlay, single-pane chat inbox (swipe), header simplified | ✅ |
| 14.2 | **Widget Mobile** — Fullscreen widget (fixed inset-0), smaller launcher (w-12), slide-up animation | ✅ |
| 14.3 | **Public Pages Mobile** — All marketing pages responsive at sm/md breakpoints | ✅ |

---

## PHASE 15 — Dark Mode

| # | Task | Status |
|---|------|--------|
| 15.1 | **Dashboard Dark** — Sidebar/header/cards/inputs/tables all dark variants from spec | ✅ |
| 15.2 | **Public Pages Dark** — Navbar/sections/footer dark variants | ✅ |
| 15.3 | **ThemeToggle** — Persists to localStorage, applies `html.dark` class | ✅ |

---

## PHASE 16 — Animations & Accessibility

| # | Task | Status |
|---|------|--------|
| 16.1 | **Scroll animations** — IntersectionObserver fadeUp/fadeIn/slideLeft/slideRight on marketing sections | ✅ |
| 16.2 | **Page transitions** — `animate-page-enter` on route change | ✅ |
| 16.3 | **Accessibility** — ARIA roles on modals/dropdowns/toasts, focus rings, skip-to-content link, reduced-motion media query | ✅ |

---

## Progress Summary

| Phase | Items | Done |
|-------|-------|------|
| Phase 1 — Design System | 20 | 20 |
| Phase 2 — Navbar/Footer | 3 | 3 |
| Phase 3 — Public Pages | 4 | 4 |
| Phase 4 — Auth Pages | 4 | 4 |
| Phase 5 — Dashboard Shell | 3 | 3 |
| Phase 6 — Chat Inbox | 4 | 4 |
| Phase 7 — Dashboard Pages | 9 | 9 |
| Phase 8 — Ticketing | 2 | 2 |
| Phase 9 — Knowledge Base | 2 | 2 |
| Phase 10 — Chatbot/Engage | 5 | 5 |
| Phase 11 — Billing | 2 | 2 |
| Phase 12 — Widget | 9 | 9 |
| Phase 13 — Notifications/CmdK | 2 | 2 |
| Phase 14 — Mobile | 3 | 3 |
| Phase 15 — Dark Mode | 3 | 3 |
| Phase 16 — Animations/A11y | 3 | 3 |
| **TOTAL** | **68** | **68** |
