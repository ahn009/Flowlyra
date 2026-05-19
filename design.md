# FlowLyra — Complete UI/UX Design Specification

> **Purpose:** Pixel-accurate design reference for implementing every page and component of FlowLyra to match LiveChat.com quality.
> **Last Updated:** May 2025
> **Based On:** LiveChat.com production site analysis + FlowLyra brand system (`#FF5100` orange primary, DM Sans/Inter/JeBrains Mono)

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [Component Library Reference](#2-component-library-reference)
3. [Public Marketing Pages](#3-public-marketing-pages)
4. [Authentication Pages](#4-authentication-pages)
5. [Agent Dashboard — Layout Shell](#5-agent-dashboard--layout-shell)
6. [Agent Dashboard — Home Page](#6-agent-dashboard--home-page)
7. [Agent Dashboard — Chat Inbox (3-Pane)](#7-agent-dashboard--chat-inbox-3-pane)
8. [Agent Dashboard — Archives](#8-agent-dashboard--archives)
9. [Agent Dashboard — Team Management](#9-agent-dashboard--team-management)
10. [Agent Dashboard — Reports & Analytics](#10-agent-dashboard--reports--analytics)
11. [Agent Dashboard — Settings Pages](#11-agent-dashboard--settings-pages)
12. [Agent Dashboard — Integrations](#12-agent-dashboard--integrations)
13. [Ticketing System](#13-ticketing-system)
14. [Knowledge Base (Admin)](#14-knowledge-base-admin)
15. [Knowledge Base (Public)](#15-knowledge-base-public)
16. [Chatbot Flow Builder](#16-chatbot-flow-builder)
17. [Campaigns & Goals](#17-campaigns--goals)
18. [Billing & Subscription](#18-billing--subscription)
19. [Engage / Proactive Triggers](#19-engage--proactive-triggers)
20. [Widget — Embedded Chat Widget](#20-widget--embedded-chat-widget)
21. [Widget — Pre-Chat Form](#21-widget--pre-chat-form)
22. [Widget — Post-Chat Survey (CSAT)](#22-widget--post-chat-survey-csat)
23. [Widget — Offline Form](#23-widget--offline-form)
24. [Widget — Rich Messages / Cards](#24-widget--rich-messages--cards)
25. [Notification Center](#25-notification-center)
26. [Command Palette (Cmd+K)](#26-command-palette-cmdk)
27. [Mobile Responsive Design](#27-mobile-responsive-design)
28. [Dark Mode Specification](#28-dark-mode-specification)
29. [Animation & Micro-Interaction Catalog](#29-animation--micro-interaction-catalog)
30. [Accessibility Requirements](#30-accessibility-requirements)

---

# 1. Design System Foundation

## 1.1 Brand Color System

### Primary — Brand Orange (`#FF5100`)

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| `brand-50` | `bg-brand-50` | `#FFF4ED` | Lightest brand bg, hover states for subtle highlights |
| `brand-100` | `bg-brand-100` | `#FFE6D5` | Light brand bg, selected row, tag bg |
| `brand-200` | `bg-brand-200` | `#FECCAA` | Medium light brand, progress track |
| `brand-300` | `bg-brand-300` | `#FDAA74` | Brand borders, light text bg |
| `brand-400` | `bg-brand-400` | `#FC823D` | Hover state for primary buttons |
| `brand-500` | `bg-brand-500` | `#FF5100` | **PRIMARY — buttons, links, active nav, chat bubbles (visitor)** |
| `brand-600` | `bg-brand-600` | `#E93D00` | Button hover/active, pressed states |
| `brand-700` | `bg-brand-700` | `#C42E00` | Button active (dark), deep emphasis |
| `brand-800` | `bg-brand-800` | `#9E2600` | Dark brand for gradient endpoints |
| `brand-900` | `bg-brand-900` | `#802200` | Darkest brand for gradient endpoints |
| `brand-950` | `bg-brand-950` | `#461200` | Near-black brand for extreme contrast |

### Neutral — Navy (`#1E232A`)

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| `navy-50` | `bg-navy-50` | `#F4F5F7` | Section backgrounds, alternating row bg |
| `navy-100` | `bg-navy-100` | `#E3E6EB` | Borders, dividers, input borders |
| `navy-200` | `bg-navy-200` | `#C7CCD6` | Disabled borders, muted text |
| `navy-300` | `bg-navy-300` | `#9BA3B2` | Placeholder text, secondary muted text |
| `navy-400` | `bg-navy-400` | `#6B7280` | Muted text, secondary labels |
| `navy-500` | `bg-navy-500` | `#4B5261` | Medium text, icons secondary |
| `navy-600` | `bg-navy-600` | `#373D48` | Subtle borders in dark mode |
| `navy-700` | `bg-navy-700` | `#1E232A` | **Primary dark — headings, dark sections, hero bg** |
| `navy-800` | `bg-navy-800` | `#171B20` | Darker bg, sidebar bg in dark mode |
| `navy-900` | `bg-navy-900` | `#0F1117` | **Deepest dark — dashboard sidebar, dark sections** |
| `navy-950` | `bg-navy-950` | `#0A0C0F` | Absolute darkest bg |

### Semantic Colors

| Token | Hex | Light Mode | Dark Mode |
|-------|-----|-----------|-----------|
| **Success** | `#1DB954` | `bg-success-50` `#ECFDF5` / `text-success-600` `#16A34A` | `bg-success-50/10` / `text-success-500` |
| **Warning** | `#FFC107` | `bg-warning-50` `#FFFBEB` / `text-warning-600` `#D97706` | `bg-warning-50/10` / `text-warning-500` |
| **Danger** | `#E53935` | `bg-danger-50` `#FEF2F2` / `text-danger-600` `#DC2626` | `bg-danger-50/10` / `text-danger-400` |
| **Info** | `#0066FF` | `bg-blue-50` `#F4FAFF` / `text-blue-700` | `bg-blue-50/10` / `text-blue-300` |
| **Purple / AI** | `#9146FF` | `bg-purple-50` `#FAF8FF` / `text-purple-600` | `bg-purple-50/10` / `text-purple-400` |

### Status Indicator Colors

| Status | Color | Hex | Dot Style |
|--------|-------|-----|-----------|
| **Online** | Green | `#1DB954` | Solid circle, 10px, glow shadow |
| **Away** | Yellow | `#FFC107` | Solid circle, 10px |
| **Offline** | Gray | `#C7CCD6` | Solid circle, 10px |
| **Busy/In Chat** | Brand Orange | `#FF5100` | Solid circle with pulse animation |
| **DND** | Red | `#E53935` | Solid circle, 10px |

### Gradient Recipes

```
/* Brand hero gradient */
background: linear-gradient(135deg, #FF5100 0%, #FF8533 50%, #FF5100 100%);

/* Dark section gradient */
background: linear-gradient(180deg, #0F1117 0%, #1E232A 100%);

/* AI accent gradient (purple → brand) */
background: linear-gradient(210deg, #9146FF 35%, #FF5100 100%);

/* AI gradient subtle overlay */
background: linear-gradient(90deg, rgba(145,70,255,0.1), rgba(255,81,0,0.1));

/* Badge gradient */
background: linear-gradient(92.92deg, #FDAA74, #FFE6D5);

/* Premium surface (radial glow) */
background: radial-gradient(circle at top left, rgba(255,81,0,0.06), transparent 34rem),
            linear-gradient(180deg, #ffffff 0%, #F8F9FA 48%, #F1F5F9 100%);
```

---

## 1.2 Typography System

### Font Stack

| Context | Font Family | Fallback | Tailwind Class |
|---------|-------------|----------|---------------|
| **Display / Headings** | `DM Sans` | system-ui, sans-serif | `font-display` |
| **Body / UI** | `Inter` | system-ui, sans-serif | `font-sans` (default) |
| **Code / Mono** | `JetBrains Mono` | ui-monospace, monospace | `font-mono` |

### Font Loading (index.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Token | Size | Line Height | Weight | Tailwind Class | Usage |
|-------|------|------------|--------|---------------|-------|
| `2xs` | 12px | 16px | 400 | `text-2xs` | Captions, metadata, timestamps |
| `xs` | 13px | 20px | 400 | `text-xs` | Small labels, helper text |
| `sm` | 14px | 20px | 400 | `text-sm` | Body text, list items, menu items |
| `base` | 16px | 24px | 400 | `text-base` | Default body |
| `lg` | 18px | 28px | 400 | `text-lg` | Emphasized body, lead paragraphs |
| `xl` | 20px | 30px | 500 | `text-xl` | Card titles, section subtitles |
| `2xl` | 24px | 32px | 600 | `text-2xl` | Page titles (dashboard), modal titles |
| `3xl` | 30px | 36px | 600 | `text-3xl` | Feature section headings |
| `4xl` | 36px | 42px | 700 | `text-4xl` | Hero subtitles, marketing h2 |
| `5xl` | 48px | 52px | 700 | `text-5xl` | Hero h1 (mobile) |
| `6xl` | 56px | 60px | 700 | `text-6xl` | Hero h1 (desktop) |
| `display` | 72px+ | 1.0-1.1 | 700 | `text-7xl` | Homepage hero headline |

### Font Weight Usage Rules

| Weight | Value | Usage |
|--------|-------|-------|
| **Regular** | `400` | Body text, descriptions, list items, table cells |
| **Medium** | `500` | Button labels, nav items, form labels, card subtitles |
| **Semi-bold** | `600` | Page titles, section headings, table headers |
| **Bold** | `700` | Hero headlines, feature titles, marketing h1/h2 |

### Letter Spacing

| Context | Value | Example |
|---------|-------|---------|
| Hero headline | `-0.02em` to `-0.035em` | `tracking-tighter` |
| All-caps labels | `0.08em` to `0.12em` | `uppercase tracking-wider` |
| Normal text | `0` | Default |
| Code blocks | `0` | Default monospace |

---

## 1.3 Spacing System

### Base Scale (Tailwind defaults + custom)

```
4px   → 1 (0.25rem)
8px   → 2 (0.5rem)
12px  → 3 (0.75rem)
16px  → 4 (1rem)      ← standard padding
20px  → 5 (1.25rem)
24px  → 6 (1.5rem)     ← section padding (mobile)
32px  → 8 (2rem)       ← card padding
40px  → 10 (2.5rem)
48px  → 12 (3rem)
64px  → 16 (4rem)      ← section padding (desktop)
80px  → 20 (5rem)
96px  → 24 (6rem)
128px → 32 (8rem)
160px → 40 (10rem)
```

### Standard Spacing Recipes

| Context | Tailwind | Pixels |
|---------|----------|--------|
| Page horizontal padding | `px-4 lg:px-8` | 16px / 32px |
| Section vertical padding (mobile) | `py-12 md:py-16 lg:py-20` | 48px → 80px |
| Card padding | `p-4 md:p-6` | 16px → 24px |
| Card gap | `gap-4 md:gap-6` | 16px → 24px |
| Input padding | `px-3 py-2` | 12px H / 8px V |
| Button padding (sm) | `px-3 py-1.5` | 12px H / 6px V |
| Button padding (default) | `px-4 py-2` | 16px H / 8px V |
| Button padding (lg) | `px-6 py-3` | 24px H / 12px V |
| Sidebar padding | `p-3` | 12px |
| List item padding | `px-3 py-2.5` | 12px H / 10px V |

---

## 1.4 Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `xs` | 4px | `rounded` | Small badges, inline tags |
| `sm` | 6px | `rounded-sm` | Tooltips, small chips |
| `md` | 8px | `rounded-md` | **Default — buttons, inputs, cards, dropdowns** |
| `lg` | 12px | `rounded-lg` | Large cards, panels, modals |
| `xl` | 16px | `rounded-xl` | Feature cards, image containers |
| `2xl` | 24px | `rounded-2xl` | Chat bubbles, hero sections |
| `3xl` | 32px | `rounded-3xl` | Large panels, fullscreen overlays |
| `full` | 9999px | `rounded-full` | Avatars, status dots, pills |

---

## 1.5 Shadow System

| Token | CSS Value | Tailwind | Usage |
|-------|-----------|----------|-------|
| `xs` | `0 1px 2px rgba(15,23,42,0.04)` | `shadow-xs` | Subtle card lift, inline elements |
| `sm` | `0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)` | `shadow-sm` | Cards, dropdowns |
| `soft` | `0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)` | `shadow-soft` | Floating cards, popovers |
| `md` | `0 4px 12px rgba(15,23,42,0.08)` | `shadow-md` | Elevated cards |
| `lift` | `0 16px 40px rgba(15,23,42,0.12)` | `shadow-lift` | Modals, drawers, major elevation |
| `glow` | `0 0 20px rgba(255,81,0,0.25)` | `shadow-glow` | Brand glow for CTAs |
| `glow-lg` | `0 0 40px rgba(255,81,0,0.15), 0 0 80px rgba(255,81,0,0.08)` | `shadow-glow-lg` | Hero decorative glow |

---

## 1.6 Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `base` | `0-4` | Normal stacking |
| `dropdown` | `10-50` | Dropdowns, popovers |
| `sticky` | `100` | Sticky headers |
| `sidebar` | `200` | Dashboard sidebar overlay |
| `overlay` | `300` | Drawer/modal backdrop |
| `modal` | `400` | Modal dialog |
| `toast` | `500` | Toast notifications |
| `command-palette` | `600` | Command palette overlay |
| `navbar` | `700` | Public site sticky navbar |
| `tooltip` | `800` | Tooltips |
| `widget` | `999999` | Embedded chat widget (highest) |

---

## 1.7 Transition Defaults

```css
/* Standard interactive transition */
transition: all 150ms cubic-bezier(0.23, 1, 0.32, 1);

/* Color-only transition */
transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;

/* Layout transition */
transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;

/* Modal/drawer transition */
transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;
```

### Tailwind Utility Pattern

```
transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
```

---

## 1.8 Scrollbar Styling

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

/* Dark mode */
html.dark ::-webkit-scrollbar-thumb { background: #2D333B; }
html.dark ::-webkit-scrollbar-thumb:hover { background: #3D4551; }
```

---

# 2. Component Library Reference

## 2.1 Button

### Variants

| Variant | Background | Text | Border | Hover BG |
|---------|-----------|------|--------|----------|
| **primary** | `bg-brand-500` | `text-white` | none | `bg-brand-600` |
| **secondary** | `bg-white` | `text-navy-700` | `border border-navy-100` | `bg-navy-50` |
| **ghost** | `transparent` | `text-navy-700` | none | `bg-navy-50` |
| **danger** | `bg-danger-500` | `text-white` | none | `bg-danger-600` |
| **outline-brand** | `transparent` | `text-brand-500` | `border border-brand-500` | `bg-brand-50` |
| **link** | `transparent` | `text-brand-500` | none | `underline` |

### Sizes

| Size | Padding | Font Size | Border Radius |
|------|---------|-----------|---------------|
| **xs** | `px-2 py-1` | `text-xs` | `rounded-md` |
| **sm** | `px-3 py-1.5` | `text-sm` | `rounded-md` |
| **default** | `px-4 py-2` | `text-sm` | `rounded-md` |
| **lg** | `px-6 py-3` | `text-base` | `rounded-lg` |
| **xl** | `px-8 py-4` | `text-lg` | `rounded-lg` |

### States

```
Default  → as specified above
Hover    → background darkens one shade, subtle translateY(-1px)
Active   → scale(0.98), darkest background shade
Disabled → opacity-50, cursor-not-allowed, pointer-events-none
Loading  → opacity-60, spinner icon replaces label
Focus    → ring-2 ring-brand-500/30 ring-offset-2
```

### Implementation Spec

```tsx
// Primary button Tailwind classes:
"inline-flex items-center justify-center gap-2 font-medium text-sm rounded-md
 bg-brand-500 text-white px-4 py-2
 hover:bg-brand-600 hover:-translate-y-px
 active:scale-[0.98]
 disabled:opacity-50 disabled:pointer-events-none
 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2
 transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
```

---

## 2.2 Input / Textarea

```
Container: relative, w-full
Input:    w-full px-3 py-2 text-sm rounded-md
          bg-white border border-navy-100
          text-navy-700 placeholder:text-navy-300
          focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
          disabled:bg-navy-50 disabled:text-navy-300 disabled:cursor-not-allowed
          transition-all duration-150

Label:    text-sm font-medium text-navy-700 mb-1.5 block
Helper:   text-xs text-navy-400 mt-1
Error:    text-xs text-danger-500 mt-1 + ring-2 ring-danger-500/30 focus:border-danger-500

Left icon addon:   pl-10 (icon absolute left-3 top-1/2 -translate-y-1/2)
Right icon addon:  pr-10 (icon absolute right-3 top-1/2 -translate-y-1/2)
```

### Dark Mode

```
Input:    bg-navy-800 border-navy-600 text-navy-50 placeholder:text-navy-400
          focus:ring-brand-500/40
          disabled:bg-navy-900
```

---

## 2.3 Select / Dropdown

```
Trigger:   same as Input + chevron-down icon on right
           min-w-[200px]
Options:   absolute top-full left-0 mt-1 w-full
           bg-white border border-navy-100 rounded-lg
           shadow-soft py-1 z-dropdown
           max-h-[240px] overflow-y-auto

Option:    px-3 py-2 text-sm text-navy-700
           hover:bg-navy-50 cursor-pointer
           selected: bg-brand-50 text-brand-600 font-medium

Group label: px-3 py-1.5 text-xs font-semibold text-navy-400 uppercase tracking-wider
```

---

## 2.4 Badge / Tag

### Variants

| Variant | Tailwind |
|---------|----------|
| **default** | `bg-navy-50 text-navy-600 px-2 py-0.5 rounded-md text-xs font-medium` |
| **brand** | `bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md text-xs font-medium` |
| **success** | `bg-success-50 text-success-600` |
| **warning** | `bg-warning-50 text-warning-600` |
| **danger** | `bg-danger-50 text-danger-600` |
| **purple** | `bg-purple-50 text-purple-600` |
| **pill** | Add `rounded-full px-3` instead of `rounded-md` |
| **dot** | Add `flex items-center gap-1.5` with `w-1.5 h-1.5 rounded-full bg-current` before text |

---

## 2.5 Avatar

```
Default:   w-8 h-8 rounded-full bg-brand-100 text-brand-600 font-medium text-sm
           flex items-center justify-center
           overflow-hidden

Sizes:
  xs:  w-6 h-6 text-2xs
  sm:  w-8 h-8 text-xs
  md:  w-10 h-10 text-sm
  lg:  w-12 h-12 text-base
  xl:  w-16 h-16 text-lg

Status indicator:
  absolute -bottom-0.5 -right-0.5
  w-3 h-3 rounded-full border-2 border-white (or bg parent)
  colors: bg-success-500 (online), bg-warning-500 (away), bg-navy-200 (offline)

With image:
  img w-full h-full object-cover
```

---

## 2.6 Card

### Standard Card

```
bg-white border border-navy-100 rounded-lg p-4 md:p-6
hover:shadow-soft hover:border-navy-200
transition-all duration-150
```

### Elevated Card (Marketing)

```
bg-white rounded-2xl p-6 md:p-8
shadow-soft hover:shadow-lift hover:-translate-y-1
transition-all duration-300
```

### Dark Card

```
bg-navy-900 rounded-2xl p-6 md:p-8
border border-navy-800
```

---

## 2.7 Modal / Dialog

```
Backdrop:   fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-modal
            animate: fade-in 200ms

Container:  fixed inset-0 z-modal flex items-center justify-center p-4

Panel:      bg-white rounded-2xl shadow-lift w-full
            max-w-md (default) / max-w-lg / max-w-2xl
            animate: scale-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1)

Header:     flex items-center justify-between px-6 py-4 border-b border-navy-100
            Title: text-lg font-semibold text-navy-700
            Close:  w-8 h-8 rounded-md hover:bg-navy-50 flex items-center justify-center

Body:       px-6 py-4 overflow-y-auto max-h-[60vh]

Footer:     flex items-center justify-end gap-3 px-6 py-4 border-t border-navy-100
```

---

## 2.8 Drawer / Sheet

```
Backdrop:   same as Modal

Panel (right): fixed right-0 top-0 h-full w-full max-w-md
               bg-white shadow-lift z-modal
               animate: slide-in-right 300ms cubic-bezier(0.23, 1, 0.32, 1)

Header:     flex items-center justify-between px-6 py-4 border-b border-navy-100
Body:       px-6 py-4 overflow-y-auto flex-1
Footer:     flex items-center gap-3 px-6 py-4 border-t border-navy-100

Close:      same as Modal close button
```

---

## 2.9 Tooltip

```
Container:  relative inline-block

Tip:        absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            bg-navy-700 text-white text-xs font-medium px-2.5 py-1.5
            rounded-md shadow-soft
            z-tooltip
            animate: fade-in 150ms
            arrow: absolute top-full left-1/2 -translate-x-1/2
                   w-2 h-2 bg-navy-700 rotate-45 -mt-1
```

---

## 2.10 Toast / Notification

```
Container:  fixed bottom-4 right-4 z-toast flex flex-col gap-2

Item:       flex items-start gap-3 p-4 rounded-lg shadow-lift
            bg-white border border-navy-100 min-w-[320px] max-w-[420px]
            animate: slide-in-right 300ms

Icon:       w-5 h-5 flex-shrink-0 mt-0.5
  success: text-success-500
  error:   text-danger-500
  warning: text-warning-500
  info:    text-blue-500

Content:
  Title: text-sm font-medium text-navy-700
  Body:  text-xs text-navy-400 mt-0.5

Close:      ml-auto w-5 h-5 rounded hover:bg-navy-50 flex-shrink-0

Progress bar (auto-dismiss): h-0.5 bg-brand-500 rounded-full animate
```

---

## 2.11 Table

```
Container:  overflow-x-auto rounded-lg border border-navy-100

Table:      w-full text-sm

Header:     bg-navy-50/80
  Cell:     px-4 py-3 text-left text-xs font-semibold text-navy-400
            uppercase tracking-wider

Body:
  Row:      border-b border-navy-100 last:border-0
            hover:bg-navy-50/50 transition-colors 100ms
  Cell:     px-4 py-3 text-sm text-navy-700

  Selected: bg-brand-50/60
  Disabled: opacity-50
```

---

## 2.12 Tabs

```
Container:   border-b border-navy-100

List:        flex gap-0 -mb-px

Trigger:     px-4 py-2.5 text-sm font-medium text-navy-400
             hover:text-navy-700 transition-colors 150ms
             border-b-2 border-transparent

Active:      text-brand-500 border-b-2 border-brand-500
             -mb-px (covers container border)
```

---

## 2.13 Skeleton

```
Base:    rounded-md
         bg-gradient(90deg, surface-muted 25%, surface-hover 50%, surface-muted 75%)
         background-size: 200% 100%
         animation: shimmer 1.5s linear infinite

Variants:
  text:  h-4 w-full
  title: h-6 w-3/4
  avatar: w-10 h-10 rounded-full
  card:  w-full h-48 rounded-lg
  button: w-24 h-10 rounded-md
```

---

## 2.14 Empty State

```
Container:  flex flex-col items-center justify-center py-16 px-4 text-center

Icon:       w-16 h-16 text-navy-200 mb-4 (illustration or icon)

Title:      text-lg font-semibold text-navy-700 mb-2

Description: text-sm text-navy-400 max-w-md mb-6

Action:     primary button
```

---

## 2.15 Spinner

```
SVG:  w-5 h-5 animate-spin
      stroke: currentColor (text-navy-400 by default)
      stroke-width: 2
      fill: none

Sizes:
  sm:  w-4 h-4
  md:  w-5 h-5
  lg:  w-8 h-8
```

---

# 3. Public Marketing Pages

## 3.1 Global Navbar (Public Pages)

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]    [AI] [Product▾] [Pricing] [Integrations▾] [CTA]  │
└─────────────────────────────────────────────────────────────┘
```

### Specs

```
Position:       sticky top-0
Height:         64px (h-16)
Background:     bg-white/90 backdrop-blur-md
Border-bottom:  border-b border-navy-100/80
Z-index:        z-navbar (700)
Padding:        px-4 lg:px-8 (horizontal), full height content

Logo:
  Width:       140px (w-36)
  Font:        DM Sans, font-bold text-xl
  Text:        "FlowLyra" with brand gradient or solid brand-500
  Mark:        chat bubble icon in brand-500, 28×28px

Nav Links:
  Font:        Inter, text-sm font-medium
  Color:       text-navy-500 hover:text-navy-700
  Padding:     px-3 py-2 rounded-md
  Hover:       bg-navy-50/60
  Active:      text-brand-500

Dropdown trigger:
  Icon:        ChevronDown 16×16, ml-1
  Panel:       absolute top-full left-0 mt-2 w-64
               bg-white rounded-xl border border-navy-100 shadow-lift p-2
               animate: fade-in 150ms
  Item:        px-3 py-2.5 rounded-lg text-sm text-navy-600 hover:bg-navy-50
  Item icon:   w-5 h-5 mr-3 text-navy-400
  Group title: px-3 py-1.5 text-xs font-semibold text-navy-400 uppercase tracking-wider

CTA Buttons:
  Login:       text-sm font-medium text-navy-500 hover:text-navy-700 px-3 py-2
  Get Started: bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium
               hover:bg-brand-600 shadow-sm hover:shadow-md transition-all 150ms

Mobile ( hamburger menu ):
  Icon:        Menu 24×24 in navy-500
  Panel:       fixed inset-0 bg-white z-overlay
               animate: slide-in-right 300ms
  Header:      flex items-center justify-between p-4 border-b
  Links:       flex flex-col p-4 gap-1
  Link:        px-4 py-3 rounded-lg text-base font-medium text-navy-700 hover:bg-navy-50
```

### Announcement Bar (optional)

```
Height:     36px (h-9)
Background: bg-brand-500
Text:       text-white text-xs font-medium text-center
Hover:      hover:bg-brand-600 (entire bar is a link)
```

---

## 3.2 Homepage

### Hero Section

```
┌─────────────────────────────────────────────┐
│                                             │
│         ✨ [AI-Powered Badge]               │
│                                             │
│     Customer Service                       │
│     That Actually Converts                │
│                                             │
│     Build relationships, increase sales,   │
│     and deliver real-time support with     │
│     AI-powered live chat.                  │
│                                             │
│     [Start Free Trial]  [Watch Demo ▶]     │
│                                             │
│     Trusted by 30,000+ companies            │
│     ○ ○ ○ ○ ○ ○ (logo marquee)             │
│                                             │
└─────────────────────────────────────────────┘
```

### Specs

```
Background:   premium-surface class
              (radial gradient glow top-left + light gradient)
              OR: bg-navy-900 with text-white (dark variant)

Padding:      py-20 md:py-28 lg:py-32
Max-width:    max-w-5xl mx-auto text-center

AI Badge:
  Display:    inline-flex items-center gap-2 px-4 py-1.5
  Background: bg-purple-50 border border-purple-200
  Text:       text-purple-600 text-xs font-semibold uppercase tracking-wider
  Icon:       Sparkles 14×14

Headline:
  Font:       DM Sans, text-5xl md:text-6xl lg:text-7xl font-bold
  Color:      text-navy-700 (light) / text-white (dark)
  Tracking:   tracking-tight
  Line height: 1.1
  Max width:  4xl (max-w-4xl mx-auto)
  Animated:   fadeIn 600ms ease-out
  Gradient word: use gradient-text class on key word

Sub-headline:
  Font:       Inter, text-lg md:text-xl text-navy-400
  Max width:  2xl (max-w-2xl mx-auto)
  Margin:     mt-6
  Line height: 1.6

CTA Group:
  Display:    flex items-center justify-center gap-4 mt-10
  Primary:    bg-brand-500 text-white px-8 py-4 rounded-xl text-base font-semibold
              shadow-glow hover:bg-brand-600 hover:shadow-glow-lg
              hover:-translate-y-0.5 transition-all 300ms
  Secondary:  bg-white text-navy-700 px-6 py-4 rounded-xl text-base font-semibold
              border border-navy-100 shadow-sm
              hover:border-navy-200 hover:shadow-soft transition-all 150ms
  Icon:       Play 16×16 inside secondary CTA

Social Proof:
  Margin:     mt-16
  Text:       "Trusted by 30,000+ companies worldwide"
  Font:       text-sm text-navy-400
  Marquee:    overflow-hidden py-6
  Track:      marquee-track (flex, animate marquee 40s linear infinite)
  Logos:      h-8 opacity-50 grayscale hover:opacity-100 transition-all
              mx-8 flex-shrink-0
  Hover:      animation-play-state: paused
```

### Feature Sections (Alternating Layout)

```
┌──────────────────────────────────────────────┐
│ Section BG: white OR navy-50 (alternating)    │
│ Padding: py-20 md:py-28 lg:py-32             │
│ Max-width: max-w-6xl mx-auto px-4 lg:px-8   │
│                                               │
│ ┌─────────────────┐  ┌─────────────────────┐  │
│ │ Section Label   │  │                     │  │
│ │ (pill badge)    │  │   Illustration /    │  │
│ │                 │  │   Screenshot         │  │
│ │ Section Title   │  │   (rounded-2xl)      │  │
│ │ (3xl, DM Sans)  │  │   shadow-lift       │  │
│ │                 │  │                     │  │
│ │ Description     │  │                     │  │
│ │ (lg, navy-400)  │  │                     │  │
│ │                 │  │                     │  │
│ │ Feature list    │  │                     │  │
│ │ ✓ Feature 1     │  │                     │  │
│ │ ✓ Feature 2     │  │                     │  │
│ │ ✓ Feature 3     │  │                     │  │
│ └─────────────────┘  └─────────────────────┘  │
│                                               │
│ (Alternate: swap text/image sides)            │
└──────────────────────────────────────────────┘
```

### Specs

```
Section Label:
  Display:    inline-flex items-center gap-2 px-3 py-1 rounded-full
  Background: bg-brand-50
  Text:       text-brand-600 text-xs font-semibold uppercase tracking-wider

Section Title:
  Font:       DM Sans, text-3xl md:text-4xl font-bold text-navy-700
  Margin:     mt-4

Description:
  Font:       text-lg text-navy-400
  Line height: 1.7
  Margin:     mt-4

Feature List:
  Margin:     mt-8
  Items:      flex items-start gap-3 text-sm text-navy-600
  Check icon: w-5 h-5 text-success-500 flex-shrink-0 mt-0.5
  Item:       py-2

Illustration:
  Rounded:    rounded-2xl
  Shadow:     shadow-lift
  Border:     border border-navy-100
  Animation:  hover:-translate-y-2 transition-transform 500ms
  Width:      w-full (takes remaining grid space)
```

### Grid Layout for Features

```
2-column:  grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center
3-column:  grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8
4-column:  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6
```

### AI Feature Section

```
Background:   bg-purple-50/50 (light purple tint)
Badge:        gradient from purple to brand
Title:        includes purple gradient text for "AI" keyword
Illustration: shows AI chat assist panel with purple accents
```

---

## 3.3 Integrations Grid Section

```
┌─────────────────────────────────────────────────────┐
│                    Integrations                      │
│         Connect with your favorite tools            │
│                                                      │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│   │Shopify│ │Slack │ │HubSpot│ │Stripe│ │WhatsApp│    │
│   │ Logo  │ │ Logo │ │ Logo │ │ Logo │ │ Logo  │    │
│   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│   │Salesf│ │Jira  │ │Zapier│ │Mailcg│ │Zendes │    │
│   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                      │
│              [View All Integrations →]               │
└─────────────────────────────────────────────────────┘
```

### Specs

```
Grid:         grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4
Card:         bg-white border border-navy-100 rounded-xl p-4
              flex flex-col items-center justify-center gap-2
              hover:border-brand-200 hover:shadow-soft hover:-translate-y-1
              transition-all 200ms cursor-pointer
Icon:         w-10 h-10 (integrations use their brand colors)
Label:        text-xs font-medium text-navy-600
```

---

## 3.4 Testimonials Section

```
Background:   bg-navy-900
Padding:      py-20 md:py-28
Text color:   text-white

Section Title: DM Sans text-3xl md:text-4xl font-bold text-white text-center

Testimonial Cards:
  Grid:       grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto
  Card:       bg-navy-800 border border-navy-700 rounded-2xl p-6
  Quote:      text-base text-navy-200 leading-relaxed
  Author:     flex items-center gap-3 mt-6 pt-6 border-t border-navy-700
    Avatar:   w-10 h-10 rounded-full
    Name:     text-sm font-semibold text-white
    Role:     text-xs text-navy-400
  Stars:      flex gap-1 mt-2 (yellow filled stars, text-warning-500)
```

---

## 3.5 CTA Section (Bottom)

```
Background:   bg-brand-500 with subtle radial gradient overlay
              OR: premium-surface with brand gradient text
Padding:      py-20 md:py-28 text-center

Title:        DM Sans text-3xl md:text-4xl font-bold
              (white on brand bg, or gradient-text on light bg)

Description:  text-lg text-white/80 (on brand bg)

Buttons:
  Primary:    bg-white text-brand-600 px-8 py-4 rounded-xl
              shadow-lg hover:shadow-lift
  Ghost:      text-white border border-white/30 px-8 py-4 rounded-xl
              hover:bg-white/10
```

---

## 3.6 Footer

```
┌──────────────────────────────────────────────────────────────┐
│ Background: bg-navy-50 border-t border-navy-100              │
│ Padding: pt-16 pb-8 px-4 lg:px-8                             │
│                                                              │
│  ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Logo  │ │ Product  │ │ Resources│ │ Company  │           │
│  │+Desc │ │ Features │ │ Blog     │ │ About    │           │
│  │      │ │ Pricing  │ │ Help     │ │ Careers  │           │
│  │      │ │ AI       │ │ Docs     │ │ Press    │           │
│  │      │ │ Widget   │ │ Status   │ │ Contact  │           │
│  └──────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                              │
│  ──────────────────────────────────────────────────          │
│  Social Icons │ © 2025 FlowLyra │ Privacy │ Terms           │
└──────────────────────────────────────────────────────────────┘
```

### Specs

```
Grid:           grid grid-cols-2 md:grid-cols-5 gap-8

Logo Column:
  Logo:         DM Sans font-bold text-xl text-navy-700
  Description:  text-sm text-navy-400 mt-3 max-w-xs

Link Columns:
  Title:        text-xs font-semibold text-navy-700 uppercase tracking-wider mb-4
  Links:        flex flex-col gap-2.5
  Link:         text-sm text-navy-400 hover:text-brand-500 transition-colors 150ms

Bottom Bar:
  Margin:       mt-12 pt-8 border-t border-navy-100
  Layout:       flex flex-col md:flex-row items-center justify-between gap-4
  Copyright:    text-xs text-navy-400
  Links:        flex items-center gap-6
  Link:         text-xs text-navy-400 hover:text-brand-500
  Social:       flex items-center gap-4
  Icon:         w-5 h-5 text-navy-400 hover:text-brand-500
```

---

## 3.7 Pricing Page

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Navbar                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│            Simple, Transparent Pricing                           │
│            Start free, scale as you grow                        │
│                                                                  │
│            [Monthly] [Annual — Save 20%]                        │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Starter  │ │  Team    │ │ Business │ │Enterprise│          │
│  │  $24/mo  │ │  $49/mo  │ │  $69/mo  │ │  Custom  │          │
│  │ (or $19) │ │ (or $41) │ │ (or $59) │ │          │          │
│  │          │ │ POPULAR  │ │          │ │          │          │
│  │ features │ │ features │ │ features │ │ features │          │
│  │ [Start]  │ │ [Start]  │ │ [Start]  │ │[Contact] │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│           [Feature Comparison Table ▼]                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Feature              │Starter│ Team │Business│Enterprise│   │
│  │ ─────────────────────┼───────┼──────┼────────┼──────────│   │
│  │ Agents               │   1   │   5  │  20    │ Unlimited│   │
│  │ Concurrent chats     │   5   │  25  │  60    │ Unlimited│   │
│  │ ...                  │       │      │        │          │   │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  FAQ Accordion                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pricing Card Specs

```
Grid:           grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
Card:           bg-white border border-navy-100 rounded-2xl p-6 md:p-8
                flex flex-col relative

Popular badge:  absolute -top-3 left-1/2 -translate-x-1/2
                bg-brand-500 text-white text-xs font-semibold px-4 py-1
                rounded-full shadow-glow
                (only on "Team" plan)

Plan name:      DM Sans text-lg font-bold text-navy-700 mt-2
Price:          text-4xl font-bold text-navy-700 mt-4
                (period: text-base font-normal text-navy-400)
Description:    text-sm text-navy-400 mt-2

Feature list:   flex flex-col gap-3 mt-6 flex-1
  Item:         flex items-start gap-2.5 text-sm text-navy-600
  Check:        w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5 (or text-success-500)
  Cross:        w-4 h-4 text-navy-200 flex-shrink-0 mt-0.5 (not included)

CTA button:     mt-8 w-full
  Normal:       bg-white text-navy-700 border border-navy-100 hover:bg-navy-50
  Popular:      bg-brand-500 text-white hover:bg-brand-600 shadow-glow
  Enterprise:   ghost style, text-brand-500 border border-brand-500 hover:bg-brand-50
```

### Toggle (Monthly/Annual)

```
Container:     flex items-center justify-center gap-3
Toggle:        relative w-14 h-7 bg-navy-200 rounded-full cursor-pointer
               transition-colors 200ms
Active:        bg-brand-500
Knob:          absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm
               left-0.5 (monthly) / left-[calc(100%-1.625rem)] (annual)
               transition-transform 200ms cubic-bezier(0.23,1,0.32,1)

Labels:        text-sm font-medium
Active:        text-navy-700
Inactive:      text-navy-400

Savings badge: inline-flex px-2 py-0.5 bg-success-50 text-success-600
               text-xs font-semibold rounded-full -ml-1
```

### Comparison Table

```
Container:     overflow-x-auto rounded-xl border border-navy-100
               max-w-6xl mx-auto mt-16
Background:    bg-white

Sticky header: sticky top-0 z-10
Header row:    bg-navy-50/80 backdrop-blur-sm
Header cell:   px-4 md:px-6 py-3 text-sm font-semibold text-navy-700
Feature cell:  px-4 md:px-6 py-3.5 text-sm text-navy-600
               border-b border-navy-100
Hover:         hover:bg-navy-50/50
Section header: bg-navy-50 font-semibold text-navy-700 py-3
Check mark:    w-5 h-5 text-brand-500
Cross mark:    w-5 h-5 text-navy-200
```

---

## 3.8 Features Page

### Layout

```
Hero:          Same pattern as homepage hero, smaller scale
               title: text-4xl md:text-5xl

Feature groups: Each with section label badge + title + grid of feature cards
Card:          bg-white border border-navy-100 rounded-xl p-6
               hover:shadow-soft hover:border-brand-200 transition-all 200ms
  Icon:        w-10 h-10 rounded-lg bg-brand-50 text-brand-500 p-2
  Title:       text-base font-semibold text-navy-700 mt-4
  Description: text-sm text-navy-400 mt-2 leading-relaxed
```

---

# 4. Authentication Pages

## 4.1 Shared Layout

```
Container:     min-h-screen flex
  Left panel:  hidden lg:flex lg:w-1/2 bg-navy-900 p-12
               flex-col justify-between relative overflow-hidden
  Right panel: w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12

Left panel content:
  Logo:        text-white DM Sans font-bold text-xl
  Decorative:  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
               radial gradient glow in brand-500/20, w-96 h-96 rounded-full
  Quote:       text-lg text-white/80 italic max-w-sm
  Quote attr:  text-sm text-white/50 mt-4

Right panel content:
  Max width:   w-full max-w-md
  Title:       DM Sans text-2xl font-bold text-navy-700
  Subtitle:    text-sm text-navy-400 mt-2
```

---

## 4.2 Login Page

```
┌──────────────────┬──────────────────┐
│                   │                  │
│  Brand visual     │  Welcome back    │
│  + decorative     │                  │
│  gradient         │  [Email input]   │
│                   │  [Password input]│
│  "Join 30,000+   │  [Forgot link]   │
│   companies"      │                  │
│                   │  [Sign In ▸]     │
│                   │                  │
│                   │  ── or ──        │
│                   │                  │
│                   │  [Google] [SSO]  │
│                   │                  │
│                   │  No account?     │
│                   │  Sign up →       │
│                   │                  │
└──────────────────┴──────────────────┘
```

### Specs

```
Form fields:   stacked vertically, gap-4
               each has label + input

Divider:       flex items-center gap-4 my-6
               border-t border-navy-100 flex-1
               text: text-xs text-navy-400 "or continue with"

Social buttons:
               flex gap-3
               bg-white border border-navy-100 rounded-lg px-4 py-2.5
               flex items-center justify-center gap-2 text-sm font-medium text-navy-700
               hover:bg-navy-50 transition-colors 150ms
               icon: w-5 h-5 (Google logo, SSO logo)
```

---

## 4.3 Signup Page

```
Same layout as Login, with additional fields:
  - Full Name
  - Work Email
  - Password (with strength indicator)
  - Company Name (optional)

Password strength indicator:
  Container:   h-1.5 bg-navy-100 rounded-full mt-2 overflow-hidden
  Bar:         h-full rounded-full transition-all 300ms
  Colors:      bg-danger-500 (weak) → bg-warning-500 (fair) → bg-brand-500 (good) → bg-success-500 (strong)
  Width:       25% / 50% / 75% / 100%
  Label:       text-xs text-navy-400 mt-1
```

---

## 4.4 Forgot Password / Reset

```
Centered layout (no split panel):
  Container:   min-h-screen flex items-center justify-center p-4
  Card:        w-full max-w-md bg-white rounded-2xl border border-navy-100
               shadow-soft p-8

  Icon:        w-12 h-12 bg-brand-50 rounded-xl text-brand-500 flex items-center justify-center mx-auto
  Title:       text-xl font-bold text-navy-700 text-center mt-4
  Description: text-sm text-navy-400 text-center mt-2

  Steps:       1. Enter email → 2. Check inbox → 3. Set new password
  Progress:    3 dots, active = brand-500 filled, inactive = navy-100
```

---

# 5. Agent Dashboard — Layout Shell

## 5.1 Overall Layout

```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar]  │            [Main Content Area]               │
│            │  ┌─────────────────────────────────────────┐ │
│ w-64       │  │ [Top Header Bar]                        │ │
│ (256px)    │  ├─────────────────────────────────────────┤ │
│            │  │                                         │ │
│            │  │         Page Content                    │ │
│            │  │         (scrollable)                    │ │
│            │  │                                         │ │
│            │  │                                         │ │
│            │  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 5.2 Sidebar Navigation

### Specs

```
Position:       fixed left-0 top-0 h-full
Width:          w-64 (256px)
Background:     bg-white (light) / bg-navy-900 (dark)
Border-right:   border-r border-navy-100
Z-index:        z-sidebar (200)
Padding:        flex flex-col

Top section:
  Logo:         px-4 py-5
                DM Sans font-bold text-xl text-brand-500
                (or: gradient text variant)
  Workspace:    px-4 flex items-center gap-2 text-sm text-navy-400
                ChevronDown icon for workspace switcher

Nav sections:   flex-1 overflow-y-auto py-2 px-2

Section label:
  Display:      px-3 py-2 text-[11px] font-semibold uppercase tracking-wider
  Color:        text-navy-300 (light) / text-navy-500 (dark)

Nav item:
  Display:      flex items-center gap-3 px-3 py-2 rounded-lg
  Font:         text-sm font-medium text-navy-600
  Icon:         w-5 h-5 text-navy-400
  Hover:        bg-navy-50 (light) / bg-navy-800 (dark)
  Active:       bg-brand-50 text-brand-600
                icon: text-brand-500

Active indicator:
  Left border:  absolute left-0 top-1/2 -translate-y-1/2
                w-1 h-5 bg-brand-500 rounded-r-full

Sub-item:
  Display:      flex items-center gap-3 pl-11 pr-3 py-1.5
  Font:         text-sm text-navy-400
  Hover:        text-navy-700 bg-navy-50/50
  Active:       text-brand-600 bg-brand-50/50
  Bullet:       w-1.5 h-1.5 rounded-full bg-current

Badge (count):
  Display:      ml-auto bg-brand-500 text-white text-[10px] font-bold
                px-1.5 py-0.5 rounded-full min-w-[18px] text-center

Bottom section:
  Padding:      p-3 border-t border-navy-100
  User:         flex items-center gap-3 p-2 rounded-lg hover:bg-navy-50
    Avatar:     w-8 h-8 rounded-full bg-brand-100 text-brand-600 font-medium text-sm
    Info:       flex flex-col
      Name:     text-sm font-medium text-navy-700
      Role:     text-xs text-navy-400
    Menu:       ChevronDown 16×16 text-navy-400
```

### Sidebar Navigation Structure

```
FlowLyra
├── [Workspace: My Company ▾]
│
├── MAIN
│   ├── Home
│   │   (LayoutDashboard icon)
│   │
│   ├── CHATS
│   │   ├── My Chats          (MessageSquare icon)
│   │   ├── Queued            (Clock icon)
│   │   ├── Assigned to Me    (UserCheck icon)
│   │   └── All Open          (Inbox icon)
│   │
│   ├── TICKETS
│   │   ├── Open              (Ticket icon)
│   │   ├── Pending           (AlertCircle icon)
│   │   └── Resolved          (CheckCircle icon)
│   │
│   └── ENGAGE
│       ├── Traffic           (Globe icon)
│       ├── Campaigns         (Megaphone icon)
│       └── Goals             (Target icon)
│
├── WORKSPACE
│   ├── Contacts          (Users icon)
│   ├── Knowledge Base    (BookOpen icon)
│   ├── Chatbot           (Bot icon)
│   └── Tags              (Tag icon)
│
├── INSIGHTS
│   └── Reports           (BarChart3 icon)
│
├── MANAGE
│   ├── Agents             (UserCog icon)
│   ├── Teams              (Users icon)
│   ├── Integrations       (Puzzle icon)
│   └── Settings           (Settings icon)
│       ├── Overview
│       ├── Widget
│       ├── Channels
│       ├── Billing
│       ├── Notifications
│       ├── Security
│       └── API Keys
│
├── SYSTEM
│   ├── API Platform       (Code icon)
│   ├── Webhooks           (Webhook icon)
│   ├── Audit Log          (FileText icon)
│   └── Archives           (Archive icon)
│
└── [User Avatar] Agent Name
    ├── Profile
    ├── Preferences
    └── Sign Out
```

---

## 5.3 Top Header Bar

```
┌──────────────────────────────────────────────────────────┐
│ [☰] │ Chat Inbox                     │ [🔍] [🔔 3] [👤]│
└──────────────────────────────────────────────────────────┘
```

### Specs

```
Position:       sticky top-0
Height:         h-14 (56px)
Background:     bg-white/80 backdrop-blur-md (light)
                bg-navy-800/80 backdrop-blur-md (dark)
Border-bottom:  border-b border-navy-100
Padding:        px-4 flex items-center justify-between

Left:
  Mobile menu:  lg:hidden, w-8 h-8 rounded-md hover:bg-navy-50
                flex items-center justify-center (Menu icon)
  Breadcrumb:   flex items-center gap-2 text-sm
    Current:    font-semibold text-navy-700
    Separator:  text-navy-300 (ChevronRight 14×14)
    Parent:     text-navy-400 hover:text-navy-600

Right:
  Search:       Cmd+K trigger
                flex items-center gap-2 px-3 py-1.5 rounded-lg
                bg-navy-50 border border-navy-100 text-sm text-navy-400
                hover:border-navy-200 cursor-pointer
                Icon: Search 16×16
                Shortcut: text-xs text-navy-300 border border-navy-200
                           rounded px-1.5 py-0.5 ml-4

  Notifications:
                relative w-8 h-8 rounded-md hover:bg-navy-50
                flex items-center justify-center
                Icon: Bell 18×18 text-navy-500
                Badge: absolute -top-0.5 -right-0.5
                       w-4 h-4 bg-brand-500 text-white text-[9px]
                       font-bold rounded-full flex items-center justify-center

  User menu:    flex items-center gap-2
                Avatar: w-8 h-8
                Dropdown: same pattern as public nav dropdown
```

---

# 6. Agent Dashboard — Home Page

## 6.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│ Good morning, Alex 👋                                     │
│ Here's what's happening today                              │
│                                                           │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │Active   │ │Unassigned│ │Avg Resp │ │Satisf.  │         │
│ │Chats:12 │ │Chats: 3  │ │Time:24s │ │Score:96%│         │
│ │↑ 18%    │ │↓ 5%     │ │↓ 3s     │ │↑ 2%     │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                           │
│ ┌──────────────────────┐ ┌──────────────────────┐        │
│ │ Recent Conversations │ │   Quick Actions       │        │
│ │                      │ │                        │        │
│ │ [chat list items]    │ │ [New Chat]             │        │
│ │                      │ │ [New Ticket]           │        │
│ │                      │ │ [View Reports]         │        │
│ └──────────────────────┘ └──────────────────────┘        │
│                                                           │
│ ┌──────────────────────────────────────────────┐         │
│ │ Agent Performance (7-day chart)               │         │
│ │ [Recharts line/bar chart]                     │         │
│ └──────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────┘
```

### Specs

```
Container:    max-w-6xl mx-auto px-6 py-6

Greeting:
  Font:       DM Sans text-2xl font-bold text-navy-700
  Subtitle:   text-sm text-navy-400 mt-1

Stats Grid:
  Grid:       grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4

  Stat Card:
    Bg:       bg-white border border-navy-100 rounded-xl p-5
    Label:    text-xs font-semibold text-navy-400 uppercase tracking-wider
    Value:    text-2xl font-bold text-navy-700 mt-1
    Trend:    flex items-center gap-1 text-sm mt-2
      Up:     text-success-500 (TrendingUp icon)
      Down:   text-danger-500 (TrendingDown icon)
      Neutral: text-navy-400

Recent Chats Panel:
  Bg:         bg-white border border-navy-100 rounded-xl
  Header:     px-5 py-4 border-b border-navy-100
    Title:    text-base font-semibold text-navy-700
    Link:     text-sm text-brand-500 hover:text-brand-600 "View all →"
  List:       divide-y divide-navy-100
    Item:     flex items-center gap-3 px-5 py-3 hover:bg-navy-50/50 cursor-pointer
      Avatar: w-8 h-8
      Info:   flex-1 min-w-0
        Name: text-sm font-medium text-navy-700
        Msg:  text-xs text-navy-400 truncate
      Meta:  text-xs text-navy-300 text-right
        Time: relative ("2m ago")
        Status: Badge

Performance Chart:
  Bg:         bg-white border border-navy-100 rounded-xl p-5
  Chart:      Recharts ResponsiveContainer, h-64
  Colors:     brand-500 for primary metric, navy-200 for comparison
```

---

# 7. Agent Dashboard — Chat Inbox (3-Pane)

## 7.1 Overall Layout

```
┌─────────┬──────────────────────┬──────────────┐
│ Chats   │   Chat Feed          │  Visitor     │
│ List    │                      │  Info Panel  │
│         │                      │              │
│ w-80    │   flex-1             │  w-80        │
│(320px)  │                      │  (320px)     │
│         │                      │              │
│ [Search]│  [Header: Name]      │ [Visitor]    │
│ [Filter]│  ─────────────────── │ [Details]    │
│         │                      │ [Notes]      │
│ ┌─────┐ │  [Messages area]     │ [Tags]       │
│ │Chat │ │  (scrollable)        │ [History]    │
│ │Item │ │                      │              │
│ │  1  │ │  Agent: Hello!       │              │
│ │     │ │           ●          │              │
│ │     │ │  Visitor: Hi         │              │
│ │     │ │                      │              │
│ │Chat │ │  [AI Assist Panel]   │              │
│ │Item │ │  ─────────────────── │              │
│ │  2  │ │                      │              │
│ │     │ │  [Reply input area]  │              │
│ │Chat │ │  [Emoji][Attach][AI] │              │
│ │Item │ │  [Send ▸]            │              │
│ │  3  │ │                      │              │
│ └─────┘ │                      │              │
└─────────┴──────────────────────┴──────────────┘
```

---

## 7.2 Conversation List (Left Pane)

### Specs

```
Width:          w-80 (320px)
Background:     bg-white
Border-right:   border-r border-navy-100
Display:        flex flex-col h-full

Header:
  Padding:      px-4 py-3 border-b border-navy-100
  Title:        text-sm font-semibold text-navy-700
  Tabs:         flex gap-1 mt-2
    Tab:        px-2.5 py-1 rounded-md text-xs font-medium
                text-navy-400 hover:text-navy-600 hover:bg-navy-50
    Active:     bg-brand-50 text-brand-600

Search:
  Margin:       px-3 py-2
  Input:        w-full pl-8 pr-3 py-1.5 text-sm rounded-md
                bg-navy-50 border border-transparent
                focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30
  Search icon:  absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400

Chat Item:
  Padding:      px-4 py-3 mx-2 rounded-lg cursor-pointer
  Hover:        bg-navy-50
  Active:       bg-brand-50 border-l-2 border-brand-500 -ml-px
  Display:      flex gap-3
  Avatar:       w-10 h-10 rounded-full flex-shrink-0 relative
    Status:     absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
                border-2 border-white bg-success-500
  Info:         flex-1 min-w-0
    Top row:    flex items-center justify-between
      Name:     text-sm font-medium text-navy-700 truncate
      Time:     text-[11px] text-navy-300
    Message:    text-xs text-navy-400 truncate mt-0.5
    Bottom:     flex items-center gap-2 mt-1
      Badge:    text-[10px] font-medium (unread count / queue position / agent name)
  Unread:       ml-auto w-5 h-5 bg-brand-500 text-white text-[10px]
                font-bold rounded-full flex items-center justify-center flex-shrink-0

Divider:       mx-4 my-1 border-t border-navy-100
  Label:       text-[10px] font-semibold text-navy-300 uppercase tracking-wider px-1

Empty state:   flex-1 flex flex-col items-center justify-center py-12
  Icon:        w-12 h-12 text-navy-200 mb-3 (Inbox icon)
  Text:        text-sm text-navy-400
```

---

## 7.3 Chat Feed (Center Pane)

### Specs

```
Flex:           flex-1 flex flex-col h-full
Background:     bg-navy-50/50 (very light, provides subtle contrast)

Chat Header:
  Padding:      px-5 py-3 border-b border-navy-100 bg-white
  Display:      flex items-center justify-between
  Left:         flex items-center gap-3
    Avatar:     w-9 h-9 rounded-full
    Name:       text-sm font-semibold text-navy-700
    Status:     text-xs text-navy-400 flex items-center gap-1.5
                (dot + "Online" / "Browsing your pricing page")
  Right:        flex items-center gap-2
    Buttons:    w-8 h-8 rounded-md hover:bg-navy-50
                flex items-center justify-center text-navy-400
                (Phone, Video, Transfer, Info panel toggle)

Messages Area:
  Flex:         flex-1 overflow-y-auto px-5 py-4
  Display:      flex flex-col gap-4

  Date divider:
    Display:    flex items-center justify-center my-4
    Text:       text-[11px] text-navy-300 bg-navy-100/60 px-3 py-1 rounded-full

  Message group (same sender, consecutive):
    Display:    flex gap-2.5 max-w-[75%]
    Agent:      flex-row (avatar left)
    Visitor:    flex-row-reverse (avatar right, if shown)

  Avatar:
    Width:      w-7 h-7 rounded-full flex-shrink-0 mt-1
    Agent:      bg-brand-100 text-brand-600 text-[11px] font-bold
    Visitor:    bg-navy-200 text-navy-600 text-[11px] font-bold

  Message bubble:
    Agent (chat-bubble-agent):
      bg-white border border-navy-100 rounded-2xl rounded-tl-md
      px-4 py-2.5 shadow-xs
      text-sm text-navy-700 leading-relaxed

    Visitor (chat-bubble-visitor):
      bg-brand-500 text-white rounded-2xl rounded-tr-md
      px-4 py-2.5 shadow-xs
      text-sm leading-relaxed

    Bot (chat-bubble-bot):
      bg-brand-50 border border-brand-100 rounded-2xl rounded-tl-md
      px-4 py-2.5
      text-sm text-navy-700 leading-relaxed
      Label:    "AI Assistant" badge at top, text-[10px] font-semibold
                text-brand-600 uppercase tracking-wider

    Note (chat-bubble-note):
      bg-warning-50 border border-warning-100 rounded-2xl
      px-4 py-2.5
      text-sm text-navy-600 italic
      Label:    "Private Note" text-[10px] font-semibold
                text-warning-600 uppercase tracking-wider

  Timestamp:
    Position:  below bubble, mt-1
    Text:      text-[10px] text-navy-300
    (show on hover or always for first message in group)

  Message meta (below bubble):
    Display:   flex items-center gap-3 mt-1
    Time:      text-[10px] text-navy-300
    Status:    text-[10px] text-navy-300
      Sent:    "Sent" or single check ✓
      Delivered: "Delivered" or double check ✓✓
      Read:    "Read" or blue double check ✓✓
    Actions:   opacity-0 group-hover:opacity-100 transition-opacity
              (Reply, Forward, Copy, Delete icons)

  Typing indicator:
    Display:   flex items-center gap-2 px-4 py-3
    Dots:      flex gap-1
      Dot:     w-1.5 h-1.5 rounded-full bg-navy-300
               animate-bounce (staggered: 0ms, 150ms, 300ms)
    Label:     text-xs text-navy-400 ml-1

  File attachment in message:
    Container: flex items-center gap-3 p-3 rounded-lg border border-navy-100
               bg-navy-50/80 max-w-xs
    Icon:      w-10 h-10 rounded-lg bg-brand-50 text-brand-500
               flex items-center justify-center
    Info:
      Name:    text-sm font-medium text-navy-700
      Size:    text-xs text-navy-400
    Download:  w-5 h-5 text-navy-400 hover:text-brand-500

  Image in message:
    Width:      max-w-xs rounded-xl overflow-hidden
    Shadow:    shadow-sm
    Hover:     cursor-pointer, overlay appears
    Caption:   text-xs text-navy-400 mt-1 text-center

  Sneak peek (visitor typing):
    Container: bg-navy-50 border border-navy-100 rounded-lg px-3 py-2
               text-xs text-navy-400 italic
    Label:     "Visitor is typing:" + partial text
    Position:  fixed to bottom of messages, above input
```

### Reply Input Area

```
Container:    bg-white border-t border-navy-100 px-5 py-3

AI Suggestion banner (if active):
  Display:    flex items-center gap-3 px-4 py-2.5 bg-purple-50
              border border-purple-200 rounded-lg mb-3
  Icon:       w-5 h-5 text-purple-500 (Sparkles)
  Text:       text-sm text-purple-700 (suggested reply text)
  Actions:    "Use" button (bg-purple-500 text-white px-3 py-1 rounded-md text-xs)
              "Dismiss" text-xs text-purple-400 hover:text-purple-600

Input area:
  Container:  border border-navy-100 rounded-xl bg-navy-50/50
              focus-within:border-brand-500 focus-within:ring-2
              focus-within:ring-brand-500/20 transition-all 150ms

  Textarea:   w-full px-4 py-2.5 text-sm text-navy-700 resize-none
              bg-transparent border-none outline-none
              placeholder:text-navy-300
              min-h-[40px] max-h-[120px]

  Toolbar:    flex items-center justify-between px-3 py-2
    Left:     flex items-center gap-1
      Button:  w-8 h-8 rounded-md hover:bg-navy-100 text-navy-400
               hover:text-navy-600 transition-colors 100ms
               flex items-center justify-center
      Icons:   Emoji (SmilePlus), Attach (Paperclip), Image (ImagePlus),
               Canned (MessageSquare), Note (StickyNote)
    Right:    flex items-center gap-2
      AI btn:  w-8 h-8 rounded-md bg-purple-50 text-purple-500
               hover:bg-purple-100 flex items-center justify-center
               (Sparkles icon)
      Send:    w-8 h-8 rounded-lg bg-brand-500 text-white
               hover:bg-brand-600 flex items-center justify-center
               disabled:bg-navy-200 disabled:text-navy-400
               transition-colors 150ms
               (SendHorizontal icon)

  Character count: text-[10px] text-navy-300 text-right pr-2
```

---

## 7.4 Visitor Info Panel (Right Pane)

### Specs

```
Width:          w-80 (320px)
Background:     bg-white
Border-left:    border-l border-navy-100
Display:        flex flex-col h-full overflow-y-auto

Header:
  Padding:      px-5 py-4 border-b border-navy-100
  Title:        "Visitor Details" text-sm font-semibold text-navy-700
  Close:        w-7 h-7 rounded-md hover:bg-navy-50 (X icon)

Sections:       divide-y divide-navy-100

Visitor Section:
  Padding:      px-5 py-4
  Avatar:       w-14 h-14 rounded-full bg-brand-100 text-brand-600
                text-xl font-bold mx-auto
  Name:         text-base font-semibold text-navy-700 text-center mt-3
  Email:        text-sm text-brand-500 text-center mt-1 (clickable)

Info Grid:
  Display:      grid grid-cols-2 gap-3
  Item:         bg-navy-50/80 rounded-lg p-3
    Label:      text-[10px] font-semibold text-navy-400 uppercase tracking-wider
    Value:      text-sm font-medium text-navy-700 mt-1

Info items:
  - Location: 🌍 City, Country
  - Browser:   🖥️ Chrome 120
  - OS:        💻 macOS
  - IP:        🔗 192.168.x.x
  - Language:  🌐 English
  - Timezone:  🕐 UTC+5
  - Page views: 👁️ 5
  - Sessions:  🔄 2
  - First visit: 📅 Jan 15, 2025
  - Referrer:  🔗 google.com

Custom Fields Section:
  Padding:      px-5 py-4
  Title:        text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3
  Fields:       flex flex-col gap-2
  Field:        text-sm
    Label:      text-navy-400
    Value:      text-navy-700

Tags Section:
  Padding:      px-5 py-4
  Title:        "Tags" text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3
  Tags:         flex flex-wrap gap-1.5
    Tag:        bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md text-xs font-medium
    Add:        bg-navy-50 text-navy-400 hover:text-navy-600 px-2 py-0.5 rounded-md text-xs
                cursor-pointer border border-dashed border-navy-200

Notes Section:
  Padding:      px-5 py-4
  Title:        "Notes" + count badge
  List:         flex flex-col gap-3
  Note:         bg-warning-50/50 rounded-lg p-3 border border-warning-100/60
    Text:       text-sm text-navy-600
    Author:     text-xs text-navy-400 mt-2
    Time:       text-[10px] text-navy-300

Chat History Section:
  Padding:      px-5 py-4
  Title:        "Previous Chats" + count
  List:         flex flex-col gap-2
  Item:         flex items-center gap-3 p-2 rounded-lg hover:bg-navy-50
    Icon:       w-8 h-8 rounded-full bg-navy-100 text-navy-400 flex items-center
                justify-center (MessageSquare 14×14)
    Info:
      Subject:  text-sm text-navy-700
      Date:     text-xs text-navy-400

Actions Section:
  Padding:      px-5 py-4 border-t border-navy-100
  Buttons:      flex flex-col gap-2
  Button:       flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
               hover:bg-navy-50 transition-colors 100ms text-navy-600
  Options:      Transfer chat, Ban visitor, Export conversation, Add to ticket
```

---

# 8. Agent Dashboard — Archives

```
Container:      full content area (no 3-pane split)

Header:
  Title:        "Archives" text-2xl font-bold
  Subtitle:     "View resolved and closed conversations"

Filters bar:
  Display:      flex items-center gap-3 px-6 py-4 border-b border-navy-100
  Search:       Input with Search icon, w-72
  Filters:      flex gap-2
    Select:     Date range, Agent, Channel, Tag
    Badge:      active filter count
  View toggle:  flex gap-1 (List / Grid icons)

Archived list:
  Table-style rows with: Subject, Visitor, Agent, Closed Date, Tags, Duration
  Row click:   expands to show full conversation

Empty state:   Archive icon + "No archived conversations"
```

---

# 9. Agent Dashboard — Team Management

## 9.1 Agents Page

```
┌──────────────────────────────────────────────────────┐
│  Agents                                    [+ Invite] │
│  Manage your support team                           │
│                                                      │
│  [Search agents...] [Role ▾] [Status ▾]              │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Avatar │ Name          │ Role    │ Status    │   │
│  │  (JD)  │ John Doe      │ Admin   │ ● Online  │   │
│  │        │ john@co.com   │         │ Chats: 3  │   │
│  ├────────┼───────────────┼─────────┼───────────┤   │
│  │  (AS)  │ Alice Smith   │ Agent   │ ● Away    │   │
│  │        │ alice@co.com  │         │           │   │
│  ├────────┼───────────────┼─────────┼───────────┤   │
│  │  (BW)  │ Bob Wilson    │ Agent   │ ● Offline │   │
│  │        │ bob@co.com    │         │           │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Specs

```
Page header:
  Display:      flex items-center justify-between
  Title:        DM Sans text-2xl font-bold text-navy-700
  Subtitle:     text-sm text-navy-400 mt-1
  Action:       bg-brand-500 text-white button

Agent row:
  Padding:      px-5 py-4 border-b border-navy-100
  Display:      flex items-center gap-4 hover:bg-navy-50/50 cursor-pointer
  Avatar:       w-10 h-10 with status dot
  Name:         text-sm font-semibold text-navy-700
  Email:        text-xs text-navy-400
  Role badge:   bg-navy-50 text-navy-600 px-2 py-0.5 rounded-md text-xs font-medium
  Status:       flex items-center gap-1.5 text-xs text-navy-500
    Dot:        w-2 h-2 rounded-full (green/yellow/gray)
  Active chats: text-xs text-navy-400 bg-navy-50 px-2 py-0.5 rounded-full

Invite modal:
  Title:        "Invite Team Member"
  Fields:       Email, Role (select), Teams (multi-select)
  Send button:  bg-brand-500 text-white
```

## 9.2 Teams Page

```
Team cards grid:
  Grid:       grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

  Team card:
    Bg:       bg-white border border-navy-100 rounded-xl p-5
    Name:     text-base font-semibold text-navy-700
    Desc:     text-sm text-navy-400 mt-1
    Members:  flex items-center gap-2 mt-4
      Avatars: flex -space-x-2 (overlapping)
      Count:  text-xs text-navy-400 ml-1 "+3 more"
    Stats:    flex items-center gap-4 mt-4 pt-4 border-t border-navy-100
      Item:   text-xs text-navy-400
        Value: font-semibold text-navy-700

Create team modal:
  Fields:     Name, Description, Assign agents (multi-select with search)
```

---

# 10. Agent Dashboard — Reports & Analytics

## 10.1 Overview Page

```
┌──────────────────────────────────────────────────────────┐
│  Reports                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐│
│  │Total      │ │Avg Resp   │ │Resolution │ │CSAT      ││
│  │Conversations│Time      │ │Time       │ │Score     ││
│  │1,247     │ │24s        │ │8m 32s     │ │96.2%     ││
│  │↑12%     │ │↓3s       │ │↓45s       │ │↑1.8%    ││
│  └───────────┘ └───────────┘ └───────────┘ └──────────┘│
│                                                           │
│  Date: [Last 7 days ▾]    [Export PDF]                   │
│                                                           │
│  ┌────────────────────────────────────────────────┐      │
│  │  Conversations Over Time                       │      │
│  │  [Line chart - Recharts]                       │      │
│  │  - Total conversations                         │      │
│  │  - Resolved conversations                     │      │
│  │  Legend: ● Total  ● Resolved                   │      │
│  └────────────────────────────────────────────────┘      │
│                                                           │
│  ┌──────────────────┐ ┌──────────────────┐               │
│  │ Channels         │ │ Top Agents       │               │
│  │ [Donut chart]    │ │ [Table/list]     │               │
│  │ Widget  65%      │ │ 1. Alice 142chats│               │
│  │ Email   20%      │ │ 2. Bob   98chats │               │
│  │ Facebook 15%     │ │ 3. Carol 87chats │               │
│  └──────────────────┘ └──────────────────┘               │
└──────────────────────────────────────────────────────────┘
```

### Chart Specs

```
Container:      bg-white border border-navy-100 rounded-xl p-5
Title:          text-base font-semibold text-navy-700 mb-4

Line chart:
  Colors:       brand-500 (primary), navy-200 (secondary)
  Grid:         horizontal grid lines in navy-50
  Axis text:    text-xs text-navy-400
  Tooltip:      bg-navy-700 text-white text-xs rounded-lg px-3 py-2 shadow-soft
  Dot:          w-3 h-3 bg-brand-500 stroke-2 stroke-white

Bar chart:
  Colors:       brand-500 (primary), navy-100 (secondary)
  Radius:       rounded-t-md (4px top corners)
  Hover:        opacity-80

Donut chart:
  Colors:       brand-500, #0066FF, #9146FF, #1DB954, #FFC107, #E53935
  Center label: text-2xl font-bold text-navy-700 (stat value)
  Sub label:    text-xs text-navy-400 (stat name)
  Legend:       flex items-center gap-2 text-xs text-navy-600
    Dot:       w-2.5 h-2.5 rounded-full

Date range picker:
  Container:   flex items-center gap-2 px-3 py-1.5 rounded-lg border border-navy-100
  Text:        text-sm text-navy-600
  Icon:        Calendar 16×16 text-navy-400

Export button:
  Icon:        Download 16×16
  Text:        text-sm font-medium text-navy-600
```

---

# 11. Agent Dashboard — Settings Pages

## 11.1 Settings Overview

```
Settings grid (card-based navigation):
  Grid:        grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
  Card:        bg-white border border-navy-100 rounded-xl p-5
              flex items-center gap-4 hover:shadow-soft hover:border-navy-200
              transition-all 150ms cursor-pointer
    Icon:      w-10 h-10 rounded-lg bg-brand-50 text-brand-500 p-2
    Content:
      Title:   text-sm font-semibold text-navy-700
      Desc:    text-xs text-navy-400 mt-0.5

  Cards: Widget, Channels, Teams, Agents, Chatbot, Integrations,
         Billing, Notifications, Security, API Keys, Webhooks, Audit Log
```

## 11.2 Widget Settings

```
Tabs: Appearance, Behavior, Pre-chat, Post-chat, Advanced

Appearance tab:
  Preview:    Phone mockup frame (w-64 h-[500px] rounded-2xl border-navy-200)
              Shows live widget preview on right, settings on left
              Split layout: grid grid-cols-1 lg:grid-cols-2 gap-8

  Settings:
    Color:     Color picker for primary color (brand-500 default)
    Position:  Select: Bottom Right / Bottom Left
    Theme:     Toggle: Light / Dark / Auto
    Title:     Input: "Chat with us" (default)
    Avatar:    Upload custom avatar (or default)
    Welcome:   Textarea: "Hi there! How can we help?"

  Widget theme options:
    Rounded:   Toggle (rounded vs square corners)
    Size:      Slider (compact / default / large)

Behavior tab:
  Auto-open:     Toggle with delay input (seconds)
  Online hours:  Schedule editor (day × time grid)
  Away timeout:  Input (seconds)
  Sound:         Toggle + volume slider
  Desktop notifications: Toggle
```

## 11.3 Notification Preferences

```
Sections: Desktop, Email, Push (each with toggles)

Notification types:
  Row:        flex items-center justify-between py-3 border-b border-navy-100
  Left:       flex items-center gap-3
    Icon:     w-5 h-5 text-navy-400
    Label:    text-sm text-navy-700
    Desc:     text-xs text-navy-400
  Right:      Toggle switch

Categories:
  - New conversation assigned
  - New message in active chat
  - Visitor returns
  - Ticket assigned
  - Ticket updated
  - CSAT rating received
  - Agent status change
  - System alerts
```

## 11.4 Security Settings (2FA, Sessions)

```
Two-Factor Auth:
  Card:       bg-white border rounded-xl p-6
  Status:     Badge (Enabled/Disabled)
  Setup:      QR code display + input for TOTP code
  Backup:     List of recovery codes (copy + regenerate)

Active Sessions:
  Table:      Device, Browser, IP, Last Active, Actions (Revoke)
  Current:    "This device" badge

API Keys:
  Table:      Name, Key (masked), Created, Last Used, Actions
  Create:     Modal with name + permissions (scopes)
```

---

# 12. Agent Dashboard — Integrations

## 12.1 Marketplace

```
Search bar:  Input with Search icon, w-full max-w-md
Categories:  flex gap-2 overflow-x-auto pb-2
  Pill:      px-4 py-1.5 rounded-full text-sm font-medium
            bg-navy-100 text-navy-600 hover:bg-navy-200
            Active: bg-brand-500 text-white

Integration Grid:
  Grid:      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4

  Card:      bg-white border border-navy-100 rounded-xl p-5
             hover:shadow-soft hover:border-navy-200 transition-all 150ms
    Header:  flex items-center gap-3
      Icon:  w-12 h-12 rounded-xl (integration brand color bg) + logo
      Info:
        Name: text-base font-semibold text-navy-700
        Desc: text-xs text-navy-400
    Body:    text-sm text-navy-500 mt-3 leading-relaxed
    Footer:  flex items-center justify-between mt-4 pt-4 border-t border-navy-100
      Badge: "Installed" (success) / "Available" (navy-400)
      Button: "Install" / "Configure" / "Uninstall"

Connected page (after install):
  Form:      Integration-specific settings (API key input, webhooks, sync options)
  Status:    Connection status indicator (green dot + "Connected")
  Test:      "Test Connection" button
```

---

# 13. Ticketing System

## 13.1 Ticket List

```
┌──────────────────────────────────────────────────────┐
│  Tickets                              [+ New Ticket]  │
│  Open (12) │ Pending (3) │ Resolved (45) │ All       │
│                                                      │
│  [Search...] [Status ▾] [Priority ▾] [Assignee ▾]   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ ID    │ Subject        │ Priority│ Assignee  │   │
│  │ #1247 │ Login issue    │ 🔴 High │ Alice     │   │
│  │ #1246 │ Billing Q      │ 🟡 Med  │ Bob       │   │
│  │ #1245 │ Feature req    │ 🟢 Low  │ Unassign  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Specs

```
Tabs:          same pattern as main tabs component
Priority colors:
  Urgent:      bg-danger-50 text-danger-600 + left border-l-2 border-danger-500
  High:        bg-brand-50 text-brand-600 + left border-l-2 border-brand-500
  Medium:      bg-warning-50 text-warning-600
  Low:         bg-navy-50 text-navy-400

Ticket detail (side panel / page):
  Header:      Ticket ID + subject + priority badge
  Meta:        Created date, updated date, assignee, requester
  Messages:    Thread-style conversation (same as chat messages)
  Sidebar:     Properties panel (status, priority, assignee, tags, due date)
  Actions:     Reply, Internal note, Change status, Merge, Delete
```

---

# 14. Knowledge Base (Admin)

## 14.1 Article List

```
Categories sidebar (left):
  Width:       w-56 (224px)
  List:        flex flex-col gap-0.5
  Item:        px-3 py-2 rounded-md text-sm text-navy-600
              hover:bg-navy-50 cursor-pointer
  Active:      bg-brand-50 text-brand-600 font-medium
  Count:       text-xs text-navy-300 ml-auto

Content area (right):
  Table:       Article title, Category, Status (Published/Draft), Updated date
  Actions:     Edit, View, Delete
  Bulk:        Checkbox selection + bulk actions bar

Create/Edit:
  Title:       text-2xl font-bold input (no border, focus:underline)
  Editor:      Rich text (Markdown or WYSIWYG)
  Sidebar:     Category, Tags, Status toggle, URL slug, SEO title/description
  Preview:     "Preview" button opens in new tab
```

---

# 15. Knowledge Base (Public)

```
Public KB layout:
  Header:      Centered, minimal. Brand logo + "Help Center" title
  Search:      Large centered search input (max-w-xl mx-auto)
               bg-white border border-navy-100 rounded-xl px-5 py-3
               text-base placeholder:text-navy-300
               shadow-soft focus:ring-2 focus:ring-brand-500/30

  Categories:  Grid of category cards
    Card:      bg-white border border-navy-100 rounded-xl p-6
               hover:shadow-soft hover:border-brand-200 transition-all 150ms
      Icon:    w-10 h-10 rounded-lg bg-brand-50 text-brand-500 p-2
      Title:   text-base font-semibold text-navy-700 mt-3
      Count:   text-xs text-navy-400 mt-1 "12 articles"

  Popular:     List of popular articles with view counts

  Article page:
    Layout:    max-w-3xl mx-auto px-6 py-8
    Breadcrumb: Home > Category > Article Title
    Title:     text-3xl font-bold text-navy-700
    Content:   Prose (typography plugin styles)
    Feedback:  "Was this helpful?" Yes/No buttons + comment input
```

---

# 16. Chatbot Flow Builder

```
Canvas layout:
  Full-screen canvas with grid dots background
  Nodes:       Draggable cards connected by lines/curves

  Node types:
    Trigger:   rounded-lg bg-brand-50 border-2 border-brand-500
               Icon + "Welcome Message"
    Message:   rounded-lg bg-white border border-navy-100 shadow-sm
               Text preview (truncated)
    Question:  rounded-lg bg-white border border-navy-100
               Question text + option chips below
    Action:    rounded-lg bg-purple-50 border border-purple-200
               Icon + action label (assign, tag, API call)
    Condition: diamond/rotated-square shape, bg-warning-50

  Connections:
    Lines:     stroke: navy-200, stroke-width: 2
    Arrow:     arrowhead SVG at end
    Label:     text-xs text-navy-400 on connection line

  Toolbar (left sidebar):
    Width:     w-56
    Sections:  Triggers, Messages, Questions, Actions, Conditions
    Items:     draggable list items with icons
    + Add:     "Add Node" button

  Properties panel (right sidebar):
    Width:     w-80
    Shows:     Properties of selected node
    Fields:    Context-specific (text input, options editor, etc.)
```

---

# 17. Campaigns & Goals

## 17.1 Campaigns List

```
Table:       Campaign name, Type, Status (Active/Draft/Paused),
             Trigger count, Goal, Start/End date
Actions:     Edit, Duplicate, Pause/Resume, Delete

Create campaign:
  Type:       Card selection (Pop-up, Embedded, Link)
  Target:     URL rules (include/exclude patterns)
  Message:    Rich text editor
  Schedule:   Start/end date, active hours
  Goal:       Select goal (visit page, start chat, purchase)
```

## 17.2 Goals

```
Goal cards:  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
  Card:      bg-white border rounded-xl p-5
    Name:    text-base font-semibold
    Type:    badge (Page Visit, Chat Started, Purchase, Custom)
    Progress: Progress bar (current/target)
    Stats:   flex items-center justify-between text-xs text-navy-400 mt-4

Create goal:
  Name:       Input
  Type:       Select
  URL:        Input (for page visit goals)
  Value:      Input (for purchase/revenue goals)
```

---

# 18. Billing & Subscription

## 18.1 Current Plan

```
Plan card:    bg-white border rounded-xl p-6 max-w-2xl
  Header:     flex items-center justify-between
    Plan:     "Team" text-xl font-bold + "Active" badge (success)
    Price:    "$49/month" text-lg text-navy-400
  Usage:      Progress bars for limits
    Agents:   3/5 used (green if under, yellow if near, red if over)
    Chats:    120/500 concurrent
    Storage:  2.4 GB / 10 GB

  Actions:    "Change Plan" (outline button) | "Cancel" (ghost danger)

Invoice list:
  Table:      Date, Description, Amount, Status (Paid/Pending/Failed), PDF download
  Pagination: at bottom
```

## 18.2 Plan Upgrade

```
Comparison:   Same pricing card grid as public pricing page
              Current plan highlighted with "Current Plan" badge
              CTA buttons show "Upgrade" or "Downgrade" with price difference

Payment method:
  Card display: Card brand icon + **** 4242 + Exp 12/26
  Actions:     "Update" (edit card) | "Remove"
  Stripe:      Stripe Elements embedded form for new card
```

---

# 19. Engage / Proactive Triggers

```
Triggers list:
  Table:      Name, Type (URL match / Time on page / Exit intent / Referrer),
             Status (Active/Inactive), Fires count, Last fired
  Actions:    Edit, Toggle, Duplicate, Delete

Create trigger:
  Conditions: AND/OR rule builder
    Rule:     [Field ▾] [Operator ▾] [Value]
    Fields:   URL, Time on page, Page scroll %, Visit count, Referrer, Country, Device
  Action:     Show message / Redirect / Track event

Traffic monitoring:
  Real-time:  Active visitors count (big number, brand color)
  List:       Current visitors with page, duration, source, device
  Refresh:    Auto-refresh every 30s
```

---

# 20. Widget — Embedded Chat Widget

## 20.1 Launcher Button

### Specs

```
Position:     fixed bottom-6 right-6 (24px from edges)
Size:         w-14 h-14 (56×56px)
Shape:        rounded-full
Background:   bg-brand-500
Icon:         MessageCircle 24×24 text-white
Shadow:       shadow-glow (0 0 20px rgba(255,81,0,0.25))
Border:       none

Hover:
  Background: bg-brand-600
  Transform:  scale(1.08)
  Shadow:     shadow-glow-lg

Active/pressed:
  Transform:  scale(0.95)

Pulse animation (when closed, no unread messages):
  Keyframes:
    0%:     box-shadow: 0 0 0 0 rgba(255,81,0,0.5)
    70%:    box-shadow: 0 0 0 12px rgba(255,81,0,0)
    100%:   box-shadow: 0 0 0 0 rgba(255,81,0,0)
  Animation:  launcher-pulse 2s ease-in-out infinite

Unread badge:
  Position:   absolute -top-1 -right-1
  Size:       min-w-[20px] h-5
  Background: bg-white text-brand-500
  Text:       text-[11px] font-bold
  Shape:      rounded-full
  Shadow:     shadow-sm
  Border:     2px solid brand-500 (creates ring effect)
  Animation:  bounce-in 350ms when count changes

Tooltip (on hover, when widget is closed):
  Text:       "Chat with us" or custom
  Position:   right-16 top-1/2 -translate-y-1/2
  Background: bg-navy-700 text-white text-xs font-medium
  Shape:      rounded-lg px-3 py-1.5
  Shadow:     shadow-sm
  Arrow:      right-pointing caret

Custom color support:
  CSS variable: --flowlyra-color: #FF5100 (default)
  All brand colors reference this variable for easy theming
```

---

## 20.2 Widget Window

### Overall Layout

```
┌────────────────────────────────┐
│ Widget Header                  │  ← h-16 (64px)
├────────────────────────────────┤
│                                │
│     Messages Area              │  ← flex-1, scrollable
│     (visitor + agent messages) │
│                                │
├────────────────────────────────┤
│ Input Area                     │  ← h-auto, max ~200px
│ [Emoji][Attach] [Type here..]  │
│                    [Send ▸]    │
└────────────────────────────────┘
```

### Window Specs

```
Position:     fixed bottom-24 right-6 (above launcher)
Size:         w-[380px] h-[560px] (default compact)
              OR: w-[380px] h-[calc(100vh-120px)] (expanded)
              OR: w-[calc(100vw-24px)] h-[calc(100vh-120px)] (mobile)
              OR: fullscreen on mobile (w-full h-full)
Background:   bg-white
Border-radius: rounded-2xl (16px) — NOT fullscreen
Shadow:       shadow-lift (0 16px 40px rgba(15,23,42,0.12))
Border:       1px solid navy-100
Z-index:      999999 (highest, above everything)
Overflow:     hidden

Open animation:
  Keyframes:  scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)
  From:       opacity 0, scale 0.9, translateY(10px)
  To:         opacity 1, scale 1, translateY 0

Close animation:
  Keyframes:  200ms ease-out
  From:       opacity 1, scale 1
  To:         opacity 0, scale 0.9, translateY(10px)

Mobile (< 480px):
  Size:       fullscreen (fixed inset-0)
  Radius:     none
  Shadow:     none
  Back button in header instead of X
```

---

## 20.3 Widget Header

### Online State

```
Height:         h-16 (64px)
Padding:        px-5
Display:        flex items-center gap-3
Background:     bg-brand-500 (uses primary color)
Text color:     text-white

Left:
  Avatar:       w-10 h-10 rounded-full bg-white/20 border border-white/30
                flex items-center justify-center
                Icon/initials in text-white font-bold text-sm
                OR: uploaded agent/team avatar

  Title group:
    Title:      text-base font-semibold text-white
    Subtitle:   text-xs text-white/80 flex items-center gap-1.5
      Dot:      w-2 h-2 rounded-full bg-success-300 (green, pulsing)
      Text:     "Online now" / "Typing..." / "Average reply time: 2m"

Right:
  Close button: w-8 h-8 rounded-full hover:bg-white/20
               flex items-center justify-center
               Icon: X 18×18 text-white
  Maximize button (optional):
               same style, Maximize2 icon
```

### Offline State

```
Background:    bg-navy-700
Avatar:        same but muted
Title:         "Leave us a message"
Subtitle:      "We're offline, but we'll get back to you"
Close:         same
```

---

## 20.4 Widget Messages Area

```
Flex:           flex-1 overflow-y-auto
Padding:        px-5 py-4
Background:     bg-navy-50/30 (subtle warm gray)

Message date divider:
  Same as dashboard: centered pill with date text

Agent message:
  Container:   flex gap-2 max-w-[85%]
  Avatar:      w-7 h-7 rounded-full bg-brand-100 text-brand-600
               text-[11px] font-bold flex-shrink-0 mt-auto
  Bubble:      bg-white rounded-2xl rounded-tl-md shadow-xs
               px-4 py-2.5 text-sm text-navy-700 leading-relaxed
  Timestamp:   text-[10px] text-navy-300 mt-1 ml-9

Visitor message:
  Container:   flex justify-end
  Bubble:      bg-brand-500 rounded-2xl rounded-tr-md shadow-xs
               px-4 py-2.5 text-sm text-white leading-relaxed
  Timestamp:   text-[10px] text-navy-300 mt-1 text-right

Bot message:
  Same as agent but with:
    Badge:     "AI" label, bg-purple-100 text-purple-600 text-[10px]
               font-bold px-1.5 py-0.5 rounded mb-1
    Bubble:    bg-purple-50/50 (subtle purple tint)

Welcome message (first message):
  Container:   text-center py-6
  Avatar:      w-14 h-14 rounded-full bg-brand-100 text-brand-500
               flex items-center justify-center mx-auto mb-3
               (MessageCircle 24×24)
  Text:        text-base font-semibold text-navy-700
  Subtitle:    text-sm text-navy-400 mt-1

Typing indicator:
  Container:   flex items-center gap-2 py-2 px-1
  Dots:        flex gap-1
    Dot:       w-2 h-2 rounded-full bg-navy-300 animate-bounce
               (stagger: 0ms, 150ms, 300ms)

Quick Replies:
  Container:   flex flex-wrap gap-2 my-2
  Button:      px-4 py-2 rounded-full text-sm font-medium
               border border-navy-200 text-navy-600
               hover:bg-navy-50 hover:border-brand-300 transition-all 150ms
               Active: bg-brand-50 border-brand-300 text-brand-600

Image message:
  Width:       max-w-[240px] rounded-xl overflow-hidden
  Shadow:      shadow-sm
  Cursor:      cursor-pointer (opens lightbox)
  Loading:     skeleton shimmer overlay

File message:
  Container:   flex items-center gap-3 p-3 rounded-xl
               bg-white border border-navy-100 shadow-xs max-w-[260px]
  Icon:        w-10 h-10 rounded-lg bg-brand-50 text-brand-500
               flex items-center justify-center
  Info:
    Name:      text-sm font-medium text-navy-700
    Size:      text-xs text-navy-400
  Download:   hover:text-brand-500 cursor-pointer

Carousel/Rich cards:
  Container:   overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2
  Card:        min-w-[220px] snap-start bg-white border border-navy-100
               rounded-xl overflow-hidden shadow-sm hover:shadow-soft
    Image:     h-32 w-full object-cover
    Content:   p-4
      Title:   text-sm font-semibold text-navy-700
      Desc:    text-xs text-navy-400 mt-1
      Button:  text-brand-500 text-xs font-medium mt-2
  Scrollbar:   hidden (scrollbar-hide utility)
```

---

## 20.5 Widget Input Area

### Online Input

```
Padding:        px-4 py-3
Background:     bg-white
Border-top:     border-t border-navy-100

Attachments preview (if files attached):
  Container:   flex gap-2 overflow-x-auto pb-2
  Chip:        flex items-center gap-2 px-3 py-1.5 rounded-lg
               bg-navy-50 border border-navy-100
    Icon:      w-5 h-5 text-navy-400
    Name:      text-xs text-navy-600 max-w-[120px] truncate
    Remove:    w-4 h-4 text-navy-400 hover:text-danger-500 cursor-pointer

Input row:
  Container:   flex items-end gap-2
  Textarea:    flex-1 px-4 py-2.5 text-sm bg-navy-50/80 rounded-xl
               border border-navy-100 resize-none
               focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
               max-h-[120px] transition-all 150ms
               placeholder: "Type your message..."
               line-height: 1.5

  Toolbar:     flex flex-col gap-1
    Buttons:   w-9 h-9 rounded-lg flex items-center justify-center
               text-navy-400 hover:text-navy-600 hover:bg-navy-50
               transition-colors 100ms
      Emoji:   SmilePlus 18×18
      Attach:  Paperclip 18×18 (triggers file input)

  Send button: w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center
               justify-center hover:bg-brand-600 transition-colors 150ms
               disabled:bg-navy-200 disabled:text-navy-400
               Icon: SendHorizontal 16×16

Powered by:
  Text:       text-[10px] text-navy-300 text-center mt-1
  Link:       "Powered by FlowLyra" hover:text-brand-500
```

### Offline Input

```
Replaced by offline form (see Section 23)
```

---

## 20.6 Widget Dark Mode

```
Triggered by: CSS class on widget container OR OS preference

Window:
  Background:  bg-navy-900
  Border:      border-navy-700

Header:
  Background:  bg-navy-800
  Text:        text-white

Messages area:
  Background:  bg-navy-950/50
  Agent bubble: bg-navy-800 border-navy-700 text-navy-100
  Visitor bubble: bg-brand-600 text-white
  Bot bubble:  bg-purple-950/50 border-purple-900/60

Input area:
  Background:  bg-navy-800
  Textarea bg: bg-navy-700 border-navy-600 text-navy-100
  Send button: bg-brand-500 hover:bg-brand-600

Launcher:
  Same brand color, but pulse uses brand-600

Timestamps:    text-navy-500
Quick replies: border-navy-600 text-navy-300 hover:bg-navy-700
```

---

# 21. Widget — Pre-Chat Form

```
Position:       Replaces messages area when pre-chat is enabled
Background:     bg-white

Header:         "Before we start" text-base font-semibold text-navy-700
                text-sm text-navy-400 mt-1

Form fields:
  Name:         Input, required
  Email:        Input email, required
  Department:   Select (optional), shows departments from settings
  Message:      Textarea (optional), pre-filled if visitor typed before form

Submit:         bg-brand-500 text-white w-full py-3 rounded-xl
                font-medium text-sm hover:bg-brand-600 transition-colors 150ms

Skip link:      text-xs text-navy-400 hover:text-brand-500 text-center mt-3
                cursor-pointer

Animation:      fade-in 200ms when appearing, slide-up 200ms
```

---

# 22. Widget — Post-Chat Survey (CSAT)

```
Position:       Replaces messages area after chat ends
Background:     bg-white

Thank you:      text-base font-semibold text-navy-700 text-center

Question:       "How would you rate this conversation?"
Rating:         flex items-center justify-center gap-3 my-6
  Stars:        w-10 h-10 text-navy-200 hover:text-warning-500 cursor-pointer
               transition-colors 100ms (animate fill)
  Scale:        OR 1-5 number buttons (rounded-lg text-sm font-medium)
               border border-navy-200 hover:border-brand-300

Comment:        Textarea (optional)
  Placeholder:  "Tell us more about your experience..."
  Rows:         3

Submit:         bg-brand-500 text-white w-full py-3 rounded-xl

Skip:           text-xs text-navy-400 text-center mt-3 cursor-pointer
```

---

# 23. Widget — Offline Form

```
Header:         OfflineSection icon + "We're currently away"
Subtitle:       "Leave us a message and we'll get back to you"

Form:
  Name:         Input, required
  Email:        Input email, required
  Message:      Textarea, required
  Department:   Select (optional)

Submit:         "Send Message" primary button
Success:        CheckCircle icon + "Message sent! We'll reply within [X hours]"

Animation:      fade-in 300ms
```

---

# 24. Widget — Rich Messages / Cards

```
Card message:
  Container:    max-w-[280px] bg-white border border-navy-100 rounded-xl
                overflow-hidden shadow-xs
  Image:        h-40 w-full object-cover
  Body:         p-4
    Title:      text-sm font-semibold text-navy-700
    Desc:       text-xs text-navy-400 mt-1.5 leading-relaxed
    Actions:    flex gap-2 mt-3
      Button:   px-3 py-1.5 rounded-lg text-xs font-medium
        Primary: bg-brand-500 text-white
        Secondary: border border-navy-200 text-navy-600

List picker:
  Container:    bg-white border border-navy-100 rounded-xl p-3 max-w-[260px]
  Title:        text-sm font-semibold text-navy-700 mb-2
  Options:      flex flex-col gap-1
    Option:     px-3 py-2 rounded-lg text-sm text-navy-600
                hover:bg-navy-50 cursor-pointer transition-colors 100ms
    Selected:   bg-brand-50 text-brand-600

Button group:
  Container:    flex gap-2 max-w-[260px]
  Button:       flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-center
    Style:      bg-brand-500 text-white OR border border-navy-200 text-navy-600
```

---

# 25. Notification Center

```
Triggered by: Bell icon in header

Panel:         absolute top-full right-0 mt-2 w-96 max-h-[480px]
               bg-white border border-navy-100 rounded-xl shadow-lift z-dropdown
               animate: fade-in 150ms + slide-down 200ms

Header:        flex items-center justify-between px-4 py-3 border-b border-navy-100
  Title:       text-sm font-semibold text-navy-700 "Notifications"
  Actions:     "Mark all read" text-xs text-brand-500 cursor-pointer

Tabs:          flex gap-0 border-b border-navy-100
  All | Unreads | Mentions

List:          overflow-y-auto max-h-[360px]
  Item:        flex gap-3 px-4 py-3 hover:bg-navy-50/50 cursor-pointer
               border-b border-navy-100/60
    Unread:    bg-brand-50/30 (left indicator bar, 3px wide)
    Avatar:    w-8 h-8 rounded-full
    Content:   flex-1 min-w-0
      Title:   text-sm font-medium text-navy-700
      Body:    text-xs text-navy-400 truncate mt-0.5
      Time:    text-[10px] text-navy-300 mt-1
    Actions:   w-5 h-5 text-navy-300 hover:text-navy-600 (dismiss icon)

Empty state:   text-center py-12
  Icon:        Bell 32×32 text-navy-200
  Text:        text-sm text-navy-400 "No notifications yet"
```

---

# 26. Command Palette (Cmd+K)

```
Trigger:       Cmd+K (Mac) / Ctrl+K (Windows)

Overlay:       fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-command-palette
               animate: fade-in 150ms

Container:     fixed top-[20%] left-1/2 -translate-x-1/2
               w-full max-w-lg bg-white rounded-2xl shadow-lift
               border border-navy-100 overflow-hidden
               animate: scale-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1)

Search input:
  Container:   flex items-center gap-3 px-5 py-4 border-b border-navy-100
  Icon:        Search 20×20 text-navy-400
  Input:       flex-1 text-base text-navy-700 bg-transparent outline-none
               placeholder: "Search conversations, agents, actions..."
  Esc badge:   text-xs text-navy-300 border border-navy-200 rounded px-1.5 py-0.5

Results:
  Container:   max-h-[320px] overflow-y-auto py-2
  Group:       px-4 py-1.5 text-[11px] font-semibold text-navy-400
               uppercase tracking-wider
  Item:        flex items-center gap-3 px-4 py-2.5 mx-1 rounded-lg cursor-pointer
               hover:bg-navy-50 transition-colors 100ms
    Active:    bg-brand-50 (keyboard navigation)
    Icon:      w-5 h-5 text-navy-400
    Label:     text-sm text-navy-700
    Shortcut:  text-xs text-navy-300 ml-auto (e.g., "G then C")
    Badge:     text-[10px] font-medium (optional context)

Footer:
  Padding:     px-4 py-2 border-t border-navy-100
  Text:        text-[10px] text-navy-300
  Content:     "↑↓ Navigate · Enter Select · Esc Close"
```

---

# 27. Mobile Responsive Design

## 27.1 Breakpoints

| Name | Min Width | Sidebar | Inbox | Widget |
|------|-----------|---------|-------|--------|
| **xs** | 0px | Hidden (hamburger) | Single pane | Fullscreen |
| **sm** | 640px | Hidden (hamburger) | Single pane | Fullscreen |
| **md** | 768px | Overlay | 2-pane (list+chat) | Expanded |
| **lg** | 1024px | Visible | 3-pane | Compact |
| **xl** | 1280px | Visible | 3-pane (wider) | Compact |

## 27.2 Dashboard Mobile (< 768px)

```
Sidebar:
  Hidden by default, triggered by hamburger icon
  Overlay: fixed inset-0 bg-navy-950/50 z-overlay
  Panel:   fixed left-0 top-0 h-full w-72 bg-white shadow-lift
           animate: slide-in-left 300ms

Chat Inbox:
  Single pane: conversation list OR chat feed (not both)
  Navigation: swipe left/right OR back button
  Chat header: shows visitor name + back arrow
  Visitor panel: slides up as bottom sheet OR separate page

Header:
  Simplified: hamburger + page title + notification bell
  Search:     moved to search page OR top of content

Tables:
  Card layout: each row becomes a card with stacked info
  OR: horizontal scroll with sticky first column
```

## 27.3 Widget Mobile (< 480px)

```
Launcher:
  Size:       w-12 h-12 (48×48px) instead of w-14
  Position:   bottom-4 right-4 (16px from edges)
  Badge:      smaller text

Window:
  Size:       fullscreen (fixed inset-0 w-full h-full)
  Radius:     none (rounded-none)
  Shadow:     none
  Animation:  slide-up from bottom

Header:
  Back button: w-8 h-8 rounded-md hover:bg-white/20 (ArrowLeft icon)
  Close:       moved to left side (replaces back button when in root)

Messages:
  Max width:  85% of screen width

Input:
  Full-width textarea, attached to bottom
  Toolbar:    single row, icons only (no labels)
```

---

# 28. Dark Mode Specification

## 28.1 Dashboard Dark Mode

### CSS Variables

```css
html.dark {
  --color-surface: #0F1117;
  --color-surface-muted: #171B20;
  --color-surface-hover: #1E232A;
  --color-ink: #F8F9FA;
  --color-muted: #9BA3B2;
  --color-text-primary: #F8F9FA;
  --color-text-secondary: #9BA3B2;
  --color-border: #2D333B;
  --color-card: #171B20;
  --color-card-hover: #1E232A;
  --color-heading: #F8F9FA;
  --color-body: #C7CCD6;
}
```

### Component Adaptations

| Component | Light | Dark |
|-----------|-------|------|
| **Sidebar** | `bg-white border-navy-100` | `bg-navy-900 border-navy-700` |
| **Header** | `bg-white/80 backdrop-blur` | `bg-navy-800/80 backdrop-blur` |
| **Card** | `bg-white border-navy-100` | `bg-navy-800 border-navy-700` |
| **Input** | `bg-white border-navy-100` | `bg-navy-800 border-navy-600` |
| **Table header** | `bg-navy-50/80` | `bg-navy-800/80` |
| **Table row hover** | `hover:bg-navy-50/50` | `hover:bg-navy-700/50` |
| **Modal backdrop** | `bg-navy-950/60` | `bg-black/70` |
| **Modal panel** | `bg-white` | `bg-navy-800` |
| **Toast** | `bg-white border-navy-100` | `bg-navy-800 border-navy-700` |
| **Chat messages bg** | `bg-navy-50/50` | `bg-navy-950/50` |
| **Agent bubble** | `bg-white border-navy-100` | `bg-navy-700 border-navy-600` |
| **Visitor bubble** | `bg-brand-500` | `bg-brand-600` |
| **Scrollbar** | `#CBD5E1` | `#2D333B` |
| **Selection** | `bg-brand-100 text-navy-700` | `bg-brand-950 text-navy-50` |
| **Focus ring** | `ring-brand-500/30` | `ring-brand-500/40` |

### Public Pages Dark Mode

```
Navbar:        bg-navy-900/90 backdrop-blur-md border-navy-700
Hero:          bg-navy-900 text-white
Sections:      alternating bg-navy-900 and bg-navy-800
Footer:        bg-navy-900 border-navy-800
Cards:         bg-navy-800 border-navy-700
Gradients:     reduced opacity (0.08 instead of 0.06 for radial glow)
```

---

# 29. Animation & Micro-Interaction Catalog

## 29.1 Page Transitions

```css
/* Standard page transition */
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-page-enter { animation: pageEnter 200ms ease-out; }

/* Modal enter */
@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Drawer slide in (right) */
@keyframes drawerIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

/* Widget open */
@keyframes widgetOpen {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
```

## 29.2 Hover Effects

```
Button hover:     -translate-y-px (1px lift) + darken bg + shadow increase
Card hover:       shadow-soft + border-darken + -translate-y-1 (4px lift) over 200ms
Nav link hover:   bg-navy-50 transition-colors 100ms
Table row hover:  bg-navy-50/50 transition-colors 100ms
Icon button hover: bg-navy-50 text-navy-600 transition-colors 100ms
Badge hover:      (none — badges are not interactive unless clickable)
```

## 29.3 Loading States

```
Spinner:          animate-spin (SVG, stroke-based)
Skeleton shimmer: linear-gradient animation, 1.5s linear infinite
Progress bar:     width transition from 0% to X% over 500ms ease-out
Dots typing:      3 dots, staggered bounce (0ms, 150ms, 300ms), infinite
Button loading:   opacity-60 + spinner replaces icon, text unchanged
Page loading:     top progress bar (h-0.5 bg-brand-500 fixed top-0 z-max)
```

## 29.4 State Changes

```
Toggle:     transition-colors 200ms + knob transition-transform 200ms cubic-bezier
Checkbox:   scale(0.8) → scale(1) on check, 100ms
Radio:      same as checkbox
Badge:      bounce-in 350ms when count changes
Toast:      slide-in-right 300ms on appear, fade-out 200ms on dismiss
Notification panel: scale-in 200ms from top-right
Command palette: scale-in 300ms with spring physics
Dropdown:   fade-in 150ms + scale(0.98) → scale(1)
Tooltip:    fade-in 100ms, delay 300ms on show, instant on hide
```

## 29.5 Scroll Animations

```
Intersection observer patterns:
  fadeUp:    opacity 0 → 1, translateY(20px → 0), 600ms ease-out
  fadeIn:    opacity 0 → 1, 400ms ease-out
  slideLeft: opacity 0 → 1, translateX(-30px → 0), 600ms ease-out
  slideRight: opacity 0 → 1, translateX(30px → 0), 600ms ease-out

Usage:      Applied via data-animate attribute + IntersectionObserver
Threshold:  0.1 (trigger when 10% visible)
Once:       true (don't re-trigger)
Stagger:    100ms delay between sibling elements
```

---

# 30. Accessibility Requirements

## 30.1 Focus Management

```
Focus ring:       ring-2 ring-brand-500/30 ring-offset-2 (standard)
Focus ring error: ring-2 ring-danger-500/30 ring-offset-2
Skip to content:  fixed top-0 left-0 sr-only focus:not-sr-only focus:z-max
                  bg-brand-500 text-white px-4 py-2 text-sm

Keyboard navigation:
  Tab:      forward focus
  Shift+Tab: backward focus
  Enter/Space: activate
  Escape:    close modal/drawer/dropdown
  Arrow keys: navigate within dropdowns, tabs, menus
  Cmd+K:     open command palette
```

## 30.2 Color Contrast

```
Minimum ratios (WCAG AA):
  Text on bg:           4.5:1 (normal text), 3:1 (large text)
  Interactive elements: 3:1 (against adjacent colors)
  Status indicators:    3:1 (with text label)

Verified pairs:
  navy-700 (#1E232A) on white:       16.2:1 ✅
  navy-400 (#6B7280) on white:       5.9:1 ✅
  brand-500 (#FF5100) on white:      3.6:1 ✅ (for large text/icons only)
  white on brand-500:                 3.6:1 ✅ (large text)
  navy-400 on navy-50 (#F4F5F7):     5.1:1 ✅
  brand-600 on white:                 4.6:1 ✅
```

## 30.3 Screen Reader Support

```
Icons:         aria-hidden="true" (decorative), aria-label (interactive)
Buttons:       aria-label if no visible text
Modals:        role="dialog", aria-modal="true", aria-labelledby="title-id"
Dropdowns:     role="menu", items role="menuitem", aria-expanded
Toasts:        role="alert" or role="status", aria-live="polite"
Loading:       aria-busy="true", aria-live="polite" on container
Progress:      role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax
Tabs:          role="tablist", role="tab", role="tabpanel", aria-selected
```

## 30.4 Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

# Appendix A: Tailwind Config Reference

The FlowLyra Tailwind config is already set up at `frontend/tailwind.config.js` with:

- **Fonts:** DM Sans (display), Inter (body), JetBrains Mono (code)
- **Colors:** brand (orange), navy (neutral), success, warning, danger
- **CSS Variables:** surface, ink, muted, text-primary, text-secondary, border, card
- **Animations:** fade-in, fade-out, slide-up, slide-down, slide-in-right, scale-in,
  bounce-in, shimmer, marquee, pulse-dot, float, typewriter
- **Shadows:** xs, soft, lift, glow, glow-lg
- **Screens:** 640/768/1024/1280/1536px
- **Dark mode:** class-based (`darkMode: "class"`)
- **Plugins:** @tailwindcss/forms, @tailwindcss/typography, tailwindcss-animate

# Appendix B: CSS Custom Properties (index.css)

Defined in `frontend/src/index.css`:
- Light/dark surface system: `--color-surface`, `--color-surface-muted`, etc.
- `.premium-surface` — radial gradient hero background
- `.glass` — frosted glass effect
- `.gradient-text` — brand gradient text clip
- `.skeleton` — shimmer loading placeholder
- `.marquee-track` — infinite scroll animation
- `.launcher-pulse` — widget button pulse
- `.chat-bubble-agent/visitor/bot/note` — message bubble styles
- Status/priority badge utility classes
- Custom scrollbar styling
- Form element defaults and focus ring
- Reduced motion support

# Appendix C: File Structure Reference

```
frontend/src/
├── components/
│   ├── ui/                    ← 33 UI components (Button, Input, etc.)
│   │   ├── index.ts           ← Barrel export
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── AgentLayout.tsx        ← Dashboard shell (sidebar + header + content)
│   ├── AIToolsMenu.tsx
│   ├── CopilotPanel.tsx
│   └── ProductTour.tsx
├── pages/
│   ├── PublicPages.tsx        ← Homepage, pricing, features, integrations
│   ├── AuthPages.tsx          ← Login, signup, forgot password
│   ├── ChatPage.tsx           ← 3-pane chat inbox
│   ├── InboxPage.tsx          ← Inbox variants
│   ├── TicketsPage.tsx        ← Ticket management
│   ├── ContactsPage.tsx       ← Contact management
│   ├── EngagePages.tsx        ← Traffic, campaigns, goals
│   ├── KnowledgeBasePage.tsx  ← KB admin
│   ├── PublicKBPage.tsx       ← Public KB
│   ├── ChatbotPage.tsx        ← Chatbot flow builder
│   ├── IntegrationsMarketplacePage.tsx
│   ├── SettingsOverviewPage.tsx
│   ├── NotificationPreferencesPage.tsx
│   ├── SecurityPage.tsx       ← 2FA, sessions
│   ├── AuditLogsPage.tsx
│   ├── ApiKeysPage.tsx
│   ├── WebhooksPage.tsx
│   ├── TagsPage.tsx
│   ├── ChannelsPage.tsx
│   └── ...
├── stores/                    ← Zustand state management
├── hooks/                     ← Custom React hooks
├── socket/                    ← Socket.IO client
├── api/                       ← API client functions
├── types/                     ← TypeScript type definitions
└── index.css                  ← Global styles, CSS variables, utilities

widget/src/
├── Widget.ts                  ← Main widget class
├── ChatPanel.ts              ← Chat messages + input
├── PreChatForm.ts            ← Pre-chat form
├── PostChatForm.ts           ← CSAT survey
├── OfflineForm.ts            ← Offline form
├── RichMessage.ts            ← Rich message/card renderer
├── SocketClient.ts           ← Socket.IO client for widget
├── styles.ts                 ← Widget CSS-in-TS styles
├── emoji.ts                  ← Emoji picker data
├── i18n.ts                   ← Internationalization
├── sound.ts                  ← Notification sounds
├── types.ts                  ← Widget types
└── utils.ts                  ← Widget utilities
```
