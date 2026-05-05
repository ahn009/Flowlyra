A premium, modern support operations workspace with a crisp light default and a refined cinematic dark mode that feels contemporary, high-contrast, and fast.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web app, desktop-first, fully responsive (320px to widescreen).
- Theme: Dual-theme product UI with light as default; dark mode must be explicit, intentional, and never low-contrast.
- Light Canvas: Cloud Blue (#f6f8fb) for app background.
- Light Surface: White (#ffffff) for cards, chat panels, tables, and forms.
- Light Border: Cool Slate (#dbe3ee) for separators and component boundaries.
- Light Text Primary: Ink (#0f172a), Text Secondary: Slate (#475569), Text Muted: Blue Gray (#64748b).
- Dark Canvas: Midnight Navy (#0b1220) for global background.
- Dark Surface: Night Panel (#111b2e) for cards/panels.
- Dark Border: Steel Indigo (#243244) for all control and panel edges.
- Dark Text Primary: Frost (#e6edf7), Dark Secondary: Mist Blue (#9aacbf).
- Primary Action: Deep Support Blue (#1e40af) with hover Royal Blue (#1d4ed8).
- Accent: Sky Signal (#38bdf8) for live/online states and realtime indicators.
- Status: Success Emerald (#16a34a), Warning Amber (#d97706), Danger Red (#dc2626).
- Typography: Inter/system sans, compact operational hierarchy (20px page title, 16px section title, 14px body).
- Component Style: 8px radius, subtle elevation, strong focus rings, no neon glows, no heavy gradients.
- Accessibility: Maintain WCAG-friendly contrast in both themes; avoid dark text on dark surfaces or light text on light surfaces.

**PAGE STRUCTURE:**
1. **Global Shell:** Collapsible left navigation + sticky top bar with polished theme switch, notification icon, and user profile.
2. **Navigation Redesign:** Ensure icons and logo are legible in both themes; active item uses primary blue chip with clear contrast.
3. **Inbox List:** WhatsApp-like unread badges, realtime status dots, compact metadata rows, and high scanability.
4. **Chat Workspace:** Split layout with conversation pane and visitor detail pane; keep composer anchored and readable in both themes.
5. **Dark Mode Quality Pass:** Replace any legacy-looking flat dark blocks with layered surfaces, nuanced borders, and modern contrast rhythm.
6. **Interaction Polish:** 150ms transitions, no layout shift on hover/focus, clear keyboard focus states, reduced-motion support.

**Targeted Fixes Required:**
1. Light mode must be the initial default on first load.
2. Theme toggle must visibly change the full app shell, not just isolated components.
3. Sidebar, header, cards, icons, and logo must remain clearly visible in both modes.
4. Remove “dark-on-dark” and “bright-on-dark” contrast failures across all major pages.

