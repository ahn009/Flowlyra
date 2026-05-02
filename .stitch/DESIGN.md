# ChatFlow Design System

ChatFlow is a premium operational SaaS for live support teams. The interface should feel calm, precise, trustworthy, and fast. Design for repeated daily use: dense enough for agent workflows, but with clear hierarchy and strong scanability.

## Platform

- Web app, desktop-first with complete mobile and tablet support.
- Primary users: support agents, team leads, admins.
- Layout style: collapsible side navigation, sticky global header, page-level command bars, responsive data panels.

## Palette

- Canvas: Cloud Blue (#f6f8fb) for the app background.
- Surface: White (#ffffff) for cards, tables, forms, and panels.
- Surface Subtle: Slate Mist (#f1f5f9) for toolbars, empty states, and secondary bands.
- Border: Cool Slate (#dbe3ee) for quiet separation.
- Text Primary: Ink (#0f172a) for headings and key values.
- Text Secondary: Slate (#475569) for body copy and metadata.
- Text Muted: Blue Gray (#64748b) for helper labels and placeholders.
- Primary Action: Deep Support Blue (#1e40af) for main actions, selected states, and active navigation.
- Primary Hover: Royal Blue (#1d4ed8).
- Accent: Sky Signal (#38bdf8) for realtime/online context and low-emphasis highlights.
- Success: Emerald (#16a34a).
- Warning: Amber (#d97706).
- Danger: Red (#dc2626).

## Typography

- Font: Inter/system sans-serif.
- Page title: 20px, 800/900 weight, tight line height.
- Section title: 16px, 800/900 weight.
- Body: 14px, 500 weight where interactive, 400/500 where descriptive.
- Labels: 12px, 700 weight, uppercase only for small metadata.
- Avoid oversized dashboard typography. Operational screens need compact hierarchy.

## Spacing

- Base grid: 8px.
- Page padding: 16px mobile, 24px desktop.
- Card padding: 16px compact, 20px standard.
- Dense rows: 12px vertical padding.
- Panel gaps: 16px mobile, 24px desktop.

## Components

- Buttons: 8px radius, 40px height default, 36px compact. Primary buttons use Deep Support Blue with white text and subtle shadow.
- Cards: 8px radius, 1px border, whisper-soft shadow. Do not nest cards inside cards unless the inner element is a repeated item.
- Inputs: 40px height, 8px radius, visible label, blue focus ring, clear placeholder.
- Pills/badges: 6px radius, 1px ring, compact label text.
- Tables: horizontally scroll on small screens, sticky-looking light header, hover row state.
- Empty states: icon tile, short title, one useful sentence.
- Side navigation: deep slate background, compact icon mode on mobile, clear active state.

## Motion And Feedback

- Transitions: 150ms, subtle background/border/transform only.
- Respect `prefers-reduced-motion`.
- Focus states must be visible on all interactive controls.
- Hover states must not shift layout.

## Responsive Rules

- No hard desktop-only grids below 1024px.
- Split views collapse to single column on mobile.
- Action rows scroll horizontally before wrapping into broken layouts.
- Tables and code blocks must overflow horizontally inside their own container, not the page.

## Stitch Prompt

Clean, sophisticated support operations SaaS with dense but calm information hierarchy, precise spacing, restrained blue-and-slate palette, white elevated surfaces, strong focus states, and responsive split-view layouts.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web app, desktop-first, fully responsive down to 320px.
- Palette: Cloud Blue (#f6f8fb) canvas, White (#ffffff) surfaces, Ink (#0f172a) text, Deep Support Blue (#1e40af) primary actions, Emerald (#16a34a) success, Amber (#d97706) warning, Red (#dc2626) danger.
- Styles: 8px radius cards/buttons, whisper-soft shadows, 1px cool slate borders, compact Inter typography, clear focus rings.

**PAGE STRUCTURE:**
1. **Global Shell:** Collapsible dark side navigation with icon-label pairings, sticky top bar, responsive content offset.
2. **Operational Pages:** Page header, command/filter band, responsive cards/tables/lists, strong empty states.
3. **Conversation Workspace:** Split chat/detail layout on desktop, single-column stacked layout on mobile, fixed composer, scrollable message area.
4. **Admin Pages:** Consistent card-based configuration forms, preview panels, copyable code blocks, responsive analytics grid.
