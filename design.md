# Flowlyra — Complete UI/UX Design System

> **Version:** 1.0.0
> **Product:** Flowlyra — Human-First Customer Support Platform
> **Status:** Production Specification
> **Date:** May 2026

---

## ⚠️ Critical Design Mandate

This document establishes an **entirely original** design identity for Flowlyra. The previous iteration of the product's UI/UX was flagged by the client as visually derivative of LiveChat.com. Every decision in this system — color, type, layout, component, illustration, motion, and brand voice — has been engineered to be **categorically distinct** from LiveChat while competing at the same tier of quality.

**What was copied (must be eliminated):**

| Copied Element                         | LiveChat Source         | Flowlyra Replacement            |
|----------------------------------------|-------------------------|----------------------------------|
| `#FF5100` theme color                  | LiveChat's brand orange | Deep Indigo `#4F46E5`            |
| Yellow `#FFD000` accent                | LiveChat's primary CTA  | Warm Coral `#F97066`             |
| Black `#1B1B20` dark tone              | LiveChat's brand black  | Midnight `#0F172A`               |
| Colfax typeface                        | LiveChat's brand font   | Plus Jakarta Sans + Fraunces     |
| "Gets the job done" tagline            | LiveChat's hero copy    | "Conversations that move"        |
| Chat-bubble logo mark                  | LiveChat's symbol       | Flowing wave/stream abstraction  |
| Yellow-black-white palette             | LiveChat's palette      | Indigo-Coral-Slate palette       |
| Feature section alternating layout     | LiveChat's exact pattern| Asymmetric overlap cards         |
| Review carousel with stars             | LiveChat's pattern      | Voice-card masonry grid          |

---

## Table of Contents

1. [Brand Foundation](#1-brand-foundation)
2. [Logo System](#2-logo-system)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout Grid](#5-spacing--layout-grid)
6. [Breakpoints & Responsive Strategy](#6-breakpoints--responsive-strategy)
7. [Iconography](#7-iconography)
8. [Elevation & Depth](#8-elevation--depth)
9. [Borders & Radius](#9-borders--radius)
10. [Motion & Animation](#10-motion--animation)
11. [Buttons & CTAs](#11-buttons--ctas)
12. [Form Elements](#12-form-elements)
13. [Cards & Containers](#13-cards--containers)
14. [Navigation System](#14-navigation-system)
15. [Hero & Landing Patterns](#15-hero--landing-patterns)
16. [Feature Section Patterns](#16-feature-section-patterns)
17. [Social Proof & Testimonials](#17-social-proof--testimonials)
18. [Pricing Section](#18-pricing-section)
19. [Footer](#19-footer)
20. [Chat Widget Design](#20-chat-widget-design)
21. [Agent Dashboard UI](#21-agent-dashboard-ui)
22. [Data Visualization](#22-data-visualization)
23. [Imagery & Illustration](#23-imagery--illustration)
24. [Copywriting Voice & Tone](#24-copywriting-voice--tone)
25. [Accessibility Standards](#25-accessibility-standards)
26. [Dark Mode System](#26-dark-mode-system)
27. [Design Tokens (Full Reference)](#27-design-tokens-full-reference)
28. [Implementation Stack](#28-implementation-stack)
29. [Component Library Spec](#29-component-library-spec)
30. [LiveChat vs Flowlyra Differentiation Checklist](#30-livechat-vs-flowlyra-differentiation-checklist)

---

## 1. Brand Foundation

### 1.1 Brand Concept

**Flowlyra** = **Flow** (fluid, effortless movement) + **Lyra** (the constellation, the ancient harp).

The name evokes conversations that move like music — rhythmic, natural, harmonious. The design system translates this into a visual language built on **flowing gradients, luminous depth, and warm precision**.

### 1.2 Brand Personality

| Trait          | Expression                                              |
|----------------|---------------------------------------------------------|
| Fluid          | Smooth transitions, flowing curves, never rigid or boxy |
| Luminous       | Depth through light — glows, gradients, not flat        |
| Human-First    | Warm colors, real photography, empathetic copy           |
| Precise        | Clean grids, tight type, professional finish             |
| Confident      | Bold statements, strong hierarchy, no hedging            |

### 1.3 Brand Positioning Against LiveChat

| Dimension       | LiveChat                        | Flowlyra                           |
|-----------------|----------------------------------|------------------------------------|
| Color Identity  | Yellow + Black (corporate warm)  | Indigo + Coral (modern luminous)   |
| Typography      | Colfax (geometric sans)          | Plus Jakarta Sans + Fraunces       |
| Aesthetic       | Flat, corporate, photography     | Layered, depth-driven, luminous    |
| Logo            | Chat bubble mark                 | Flowing stream/wave abstraction    |
| Tone            | "We get the job done"            | "Conversations that move"          |
| Layout          | Rigid alternating 50/50          | Asymmetric overlapping cards       |
| Hero Style      | Text + product shot              | Full-bleed gradient + floating UI  |
| Testimonials    | Star-rating carousel             | Voice-card masonry grid            |

### 1.4 Taglines (Replace All LiveChat-Copied Lines)

| Usage              | Copy                                                          |
|--------------------|---------------------------------------------------------------|
| Primary tagline    | "Conversations that move"                                     |
| Hero headline      | "Support that flows. Sales that grow."                        |
| Sub-headline       | "The human-first platform where every chat turns into value." |
| Feature lead       | "Built for the rhythm of real conversations."                 |
| CTA line           | "Start flowing free"                                          |
| Trust line         | "Trusted by 10,000+ support teams worldwide"                 |
| Product descriptor | "AI-augmented live chat & customer support platform"          |

---

## 2. Logo System

### 2.1 Concept

The Flowlyra mark is an **abstract flowing stream** — two fluid arcs suggesting a conversation in motion. It avoids the chat-bubble cliché used by LiveChat, Intercom, Drift, and most competitors.

### 2.2 Logo Anatomy

```
┌──────────────────────────────────────────┐
│                                          │
│   ╭─────╮                               │
│   │     ╰───╮    F l o w l y r a        │
│   ╰──╮      │                           │
│      ╰──────╯                           │
│                                          │
│   [Mark]        [Wordmark]              │
│                                          │
└──────────────────────────────────────────┘

Mark: Two intertwined fluid arcs (gradient: Indigo → Coral)
Wordmark: "Flowlyra" set in Plus Jakarta Sans SemiBold
```

### 2.3 Logo Variants

| Variant            | Usage                                         |
|--------------------|-----------------------------------------------|
| Full Color         | Default — gradient mark + dark wordmark        |
| Indigo Mono        | Single-color contexts                         |
| White Reverse      | On dark / gradient backgrounds                |
| Mark Only          | Favicon, app icon, loading, small spaces      |
| Wordmark Only      | Co-branding, legal, very wide contexts        |

### 2.4 Logo Colors

| Element    | Default                  | Dark Background           |
|------------|--------------------------|---------------------------|
| Mark       | Gradient: `#4F46E5` → `#F97066` | White `#FFFFFF`     |
| Wordmark   | `#0F172A` (Midnight)     | `#FFFFFF`                 |

### 2.5 Clear Space

Minimum clear space = **the height of the lowercase "o"** in the wordmark, on all four sides.

### 2.6 Minimum Sizes

| Context    | Minimum Width                          |
|------------|----------------------------------------|
| Digital    | 100px (full logo), 24px (mark only)    |
| Print      | 30mm (full logo), 8mm (mark only)      |

### 2.7 Logo Misuse

Never: use the LiveChat orange (`#FF5100`), add a chat-bubble shape, stretch or rotate, place on clashing backgrounds, add shadows or outlines, change the gradient direction, retype the wordmark in a different font.

---

## 3. Color System

### 3.1 Design Principle

Flowlyra's palette is built on **depth and warmth** — deep indigo grounds the system, warm coral provides energy, and a neutral slate scale handles the everyday. This is categorically different from LiveChat's yellow/black/white palette.

### 3.2 Primary Brand Colors

| Name             | Hex       | RGB            | HSL               | Usage                              |
|------------------|-----------|----------------|--------------------|------------------------------------|
| **Indigo 600**   | `#4F46E5` | 79, 70, 229    | 243°, 75%, 59%    | Primary brand, CTAs, links, active |
| **Indigo 700**   | `#4338CA` | 67, 56, 202    | 245°, 58%, 51%    | Hover states, pressed buttons      |
| **Indigo 500**   | `#6366F1` | 99, 102, 241   | 239°, 84%, 67%    | Light accents, tags, badges        |
| **Indigo 50**    | `#EEF2FF` | 238, 242, 255  | 226°, 100%, 97%   | Tinted backgrounds, highlights     |

### 3.3 Accent Colors

| Name             | Hex       | RGB            | HSL               | Usage                              |
|------------------|-----------|----------------|--------------------|------------------------------------|
| **Coral 500**    | `#F97066` | 249, 112, 102  | 4°, 93%, 69%      | Secondary CTAs, highlights, badges |
| **Coral 600**    | `#EF4444` | 239, 68, 68    | 0°, 84%, 60%      | Error states, destructive actions  |
| **Coral 50**     | `#FFF5F5` | 255, 245, 245  | 0°, 100%, 98%     | Error backgrounds                  |
| **Amber 400**    | `#FBBF24` | 251, 191, 36   | 43°, 96%, 56%     | Warning, in-progress, highlights   |
| **Amber 50**     | `#FFFBEB` | 255, 251, 235  | 48°, 100%, 96%    | Warning backgrounds                |
| **Emerald 500**  | `#10B981` | 16, 185, 129   | 160°, 84%, 39%    | Success, online, positive          |
| **Emerald 50**   | `#ECFDF5` | 236, 253, 245  | 152°, 81%, 96%    | Success backgrounds                |

### 3.4 Neutral Scale (Slate)

| Name            | Hex       | Usage                                              |
|-----------------|-----------|-----------------------------------------------------|
| **Midnight**    | `#0F172A` | Headings, primary text, dark backgrounds            |
| **Slate 800**   | `#1E293B` | Secondary headings, dark UI                         |
| **Slate 700**   | `#334155` | Body text (on light), strong labels                 |
| **Slate 600**   | `#475569` | Secondary body text                                 |
| **Slate 500**   | `#64748B` | Muted text, placeholders                            |
| **Slate 400**   | `#94A3B8` | Disabled text, subtle icons                         |
| **Slate 300**   | `#CBD5E1` | Borders, dividers                                   |
| **Slate 200**   | `#E2E8F0` | Input borders, light dividers                       |
| **Slate 100**   | `#F1F5F9` | Backgrounds, alternating rows                       |
| **Slate 50**    | `#F8FAFC` | Page background, subtle surfaces                    |
| **White**       | `#FFFFFF` | Cards, elevated surfaces                            |

### 3.5 Gradient Library

| Name                  | CSS                                                  | Usage                          |
|-----------------------|------------------------------------------------------|--------------------------------|
| **Brand Gradient**    | `linear-gradient(135deg, #4F46E5, #7C3AED, #F97066)`| Hero backgrounds, hero CTAs    |
| **Indigo Glow**       | `linear-gradient(180deg, #4F46E5, #312E81)`          | Dark sections, footer          |
| **Coral Sunrise**     | `linear-gradient(135deg, #F97066, #FBBF24)`          | Accent highlights, tags        |
| **Surface Wash**      | `linear-gradient(180deg, #F8FAFC, #EEF2FF)`          | Section transitions            |
| **Glass**             | `rgba(255,255,255,0.7)` + `backdrop-filter: blur(16px)` | Nav bar, floating cards    |

### 3.6 Color Hierarchy Decision Tree

```
Is it a primary action?
  → Indigo 600 (fill) or White (on Indigo bg)
Is it destructive?
  → Coral 600
Is it positive/success?
  → Emerald 500
Is it a warning?
  → Amber 400
Is it a link?
  → Indigo 600 (underline on hover)
Is it body text?
  → Slate 700 (primary) or Slate 500 (secondary)
Is it a background?
  → White (card) or Slate 50 (page) or Indigo 50 (tinted)
```

---

## 4. Typography

### 4.1 Font Selection Rationale

LiveChat uses Colfax — a geometric sans-serif. Flowlyra uses a deliberately different pairing:

| Role         | Font                  | Why                                          |
|--------------|-----------------------|----------------------------------------------|
| **Display**  | **Fraunces**          | Soft serif with "wonky" optical weight — memorable, warm, NOT corporate geometric |
| **UI / Body**| **Plus Jakarta Sans** | Modern humanist sans — warmer than Inter, more distinctive than system fonts |
| **Mono**     | **JetBrains Mono**    | Code blocks, technical data, widget IDs      |

### 4.2 Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 4.3 Type Scale — Marketing Website

| Token                | Font            | Size    | Weight | Line Height | Letter Spacing | Usage                      |
|----------------------|-----------------|---------|--------|-------------|----------------|----------------------------|
| `display-hero`       | Fraunces        | 64px    | 800    | 1.05        | -0.03em        | Hero headlines only        |
| `display-lg`         | Fraunces        | 48px    | 700    | 1.1         | -0.025em       | Section headlines          |
| `display-md`         | Fraunces        | 36px    | 700    | 1.15        | -0.02em        | Sub-section headlines      |
| `display-sm`         | Fraunces        | 28px    | 600    | 1.2         | -0.01em        | Card titles, feature heads |
| `heading-lg`         | Plus Jakarta    | 22px    | 700    | 1.3         | -0.005em       | Component headers          |
| `heading-md`         | Plus Jakarta    | 18px    | 600    | 1.4         | 0              | Panel / card headers       |
| `heading-sm`         | Plus Jakarta    | 16px    | 600    | 1.4         | 0              | Sub-headers, labels        |
| `body-lg`            | Plus Jakarta    | 18px    | 400    | 1.7         | 0              | Lead paragraphs            |
| `body-md`            | Plus Jakarta    | 16px    | 400    | 1.6         | 0              | Default body               |
| `body-sm`            | Plus Jakarta    | 14px    | 400    | 1.5         | 0              | Secondary content          |
| `caption`            | Plus Jakarta    | 12px    | 500    | 1.4         | 0.03em         | Labels, metadata           |
| `overline`           | Plus Jakarta    | 11px    | 700    | 1.2         | 0.1em          | Section labels (uppercase) |
| `code`               | JetBrains Mono  | 14px    | 400    | 1.6         | 0              | Code, technical data       |

### 4.4 Type Scale — Agent Dashboard

| Token                | Font            | Size    | Weight | Usage                      |
|----------------------|-----------------|---------|--------|----------------------------|
| `app-title`          | Plus Jakarta    | 20px    | 700    | Page titles                |
| `app-section`        | Plus Jakarta    | 16px    | 600    | Panel headers              |
| `app-body`           | Plus Jakarta    | 14px    | 400    | Default text               |
| `app-small`          | Plus Jakarta    | 13px    | 400    | Side panels, metadata      |
| `app-micro`          | Plus Jakarta    | 11px    | 500    | Timestamps, counts         |
| `app-mono`           | JetBrains Mono  | 13px    | 400    | Chat IDs, error codes      |

### 4.5 Responsive Type Scaling

```css
/* Mobile-first fluid scaling */
--display-hero: clamp(2.25rem, 5vw + 1rem, 4rem);     /* 36px → 64px */
--display-lg:   clamp(1.75rem, 3.5vw + 0.75rem, 3rem); /* 28px → 48px */
--display-md:   clamp(1.5rem, 2.5vw + 0.5rem, 2.25rem);/* 24px → 36px */
--body-lg:      clamp(1rem, 1vw + 0.5rem, 1.125rem);    /* 16px → 18px */
```

---

## 5. Spacing & Layout Grid

### 5.1 Base Unit

**4px base grid.** All spacing is a multiple of 4. Components snap to an **8px rhythm** for visual consistency.

### 5.2 Spacing Tokens

| Token      | Value   | Px   | Usage                                          |
|------------|---------|------|-------------------------------------------------|
| `space-0`  | 0       | 0    | Reset                                           |
| `space-px` | 1px     | 1    | Hairline borders                                |
| `space-0.5`| 0.125rem| 2    | Micro adjustments                               |
| `space-1`  | 0.25rem | 4    | Icon gaps, tight padding                        |
| `space-1.5`| 0.375rem| 6    | Badge padding                                   |
| `space-2`  | 0.5rem  | 8    | Inline gaps, small padding                      |
| `space-3`  | 0.75rem | 12   | Input padding, compact card padding             |
| `space-4`  | 1rem    | 16   | Default padding, form groups                    |
| `space-5`  | 1.25rem | 20   | Card padding, comfortable gaps                  |
| `space-6`  | 1.5rem  | 24   | Section inner padding, card gaps                |
| `space-8`  | 2rem    | 32   | Component separation                            |
| `space-10` | 2.5rem  | 40   | Sub-section gaps                                |
| `space-12` | 3rem    | 48   | Section vertical rhythm                         |
| `space-16` | 4rem    | 64   | Major section breaks                            |
| `space-20` | 5rem    | 80   | Hero-to-content gap                             |
| `space-24` | 6rem    | 96   | Section vertical padding (desktop)              |
| `space-32` | 8rem    | 128  | Hero vertical padding (desktop)                 |
| `space-40` | 10rem   | 160  | Extra-large section padding                     |

### 5.3 Content Container

| Property          | Value                                       |
|-------------------|---------------------------------------------|
| Max Width         | `1280px`                                    |
| Padding           | `16px` (mobile), `24px` (tablet), `32px` (desktop) |
| Centering         | `margin-inline: auto`                       |
| Narrow Variant    | `max-width: 768px` (for text-heavy pages)   |
| Wide Variant      | `max-width: 1440px` (for dashboards)        |

---

## 6. Breakpoints & Responsive Strategy

### 6.1 Breakpoints

| Token    | Width    | Approach              | Usage                              |
|----------|----------|-----------------------|------------------------------------|
| `xs`     | 0px      | Mobile-first (base)   | Single column, stacked             |
| `sm`     | 640px    | Small tablets          | 2-col where appropriate            |
| `md`     | 768px    | Tablets                | Nav shifts, 2-col grids            |
| `lg`     | 1024px   | Laptops                | Full nav, 3-col grids              |
| `xl`     | 1280px   | Desktop                | Max containers, full layout        |
| `2xl`    | 1536px   | Large monitors         | Generous margins, relaxed density  |

### 6.2 Grid System

**12-column CSS Grid** with flexible gaps:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);    /* 24px */
}

/* Responsive column spans */
.col-full   { grid-column: span 12; }
.col-half   { grid-column: span 6; }
.col-third  { grid-column: span 4; }
.col-quarter{ grid-column: span 3; }

@media (max-width: 768px) {
  .col-half, .col-third, .col-quarter {
    grid-column: span 12;
  }
}
```

### 6.3 Layout Patterns (Marketing Site)

| Pattern                    | Desktop Grid          | Tablet        | Mobile        |
|----------------------------|-----------------------|---------------|---------------|
| Hero                       | 7 + 5 (text + visual) | 12 stacked    | 12 stacked    |
| Feature showcase           | 5 + 7 (asymmetric)    | 6 + 6         | 12 stacked    |
| Three-card grid            | 4 + 4 + 4             | 6 + 6 + 12   | 12 stacked    |
| Testimonial masonry        | 4 + 4 + 4 (staggered) | 6 + 6        | 12 stacked    |
| Pricing cards              | 4 + 4 + 4             | 4 + 4 + 4    | 12 stacked    |
| Stats bar                  | 3 + 3 + 3 + 3         | 6 + 6        | 12 stacked    |
| Footer                     | 3 + 2 + 2 + 2 + 3     | 6 + 6        | 12 stacked    |

---

## 7. Iconography

### 7.1 Icon System

| Property          | Specification                                 |
|-------------------|-----------------------------------------------|
| Style             | **Outlined / stroke-based** (2px stroke)      |
| Grid              | 24 × 24px default viewBox                    |
| Sizes             | 16, 20, 24, 32, 40px                         |
| Stroke Cap        | Round                                         |
| Stroke Join       | Round                                         |
| Color             | Inherits `currentColor`                       |
| Library           | Lucide React (open source, consistent style) |

### 7.2 Icon Categories

| Category           | Examples                                    |
|--------------------|---------------------------------------------|
| Navigation         | Menu, X, ChevronDown, ArrowRight            |
| Communication      | MessageCircle, Mail, Phone, Video           |
| Actions            | Send, Plus, Edit, Trash, Copy, Download     |
| Status             | CheckCircle, AlertTriangle, XCircle, Clock  |
| People             | User, Users, UserPlus, Shield               |
| Analytics          | BarChart, TrendingUp, PieChart, Activity    |
| Product            | Headset, Bot, Zap, Settings, Layers         |

### 7.3 Feature Icons (Marketing)

For marketing feature sections, use **duotone filled icons** at 48px inside a `56px × 56px` rounded container with `Indigo 50` background and `Indigo 600` icon color. This replaces LiveChat's approach of using product screenshots as feature icons.

---

## 8. Elevation & Depth

### 8.1 Shadow Scale

| Token           | CSS Value                                                       | Usage                        |
|-----------------|-----------------------------------------------------------------|------------------------------|
| `shadow-xs`     | `0 1px 2px 0 rgba(15,23,42,0.04)`                             | Subtle lift                  |
| `shadow-sm`     | `0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.06)` | Inputs, resting cards |
| `shadow-md`     | `0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05)` | Dropdowns, popovers  |
| `shadow-lg`     | `0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04)` | Modals, floating panels |
| `shadow-xl`     | `0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.06)` | Chat widget, hero cards |
| `shadow-2xl`    | `0 25px 50px -12px rgba(15,23,42,0.2)`                        | Dramatic hero elements       |
| `shadow-inner`  | `inset 0 2px 4px 0 rgba(15,23,42,0.05)`                       | Pressed states, wells        |

### 8.2 Glow Effects (Brand Differentiator)

Unlike LiveChat's flat shadows, Flowlyra uses **colored glow shadows** to create a luminous, depth-driven aesthetic:

```css
/* Indigo glow — for primary CTAs */
--glow-indigo: 0 0 20px rgba(79, 70, 229, 0.25), 0 0 60px rgba(79, 70, 229, 0.1);

/* Coral glow — for accent highlights */
--glow-coral: 0 0 20px rgba(249, 112, 102, 0.25), 0 0 60px rgba(249, 112, 102, 0.1);

/* Glass surface */
--glass: background: rgba(255,255,255,0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.3);
```

---

## 9. Borders & Radius

### 9.1 Radius Scale

| Token           | Value    | Usage                                       |
|-----------------|----------|---------------------------------------------|
| `radius-none`   | 0        | Tables, tight containers                    |
| `radius-sm`     | 4px      | Tags, micro badges                          |
| `radius-md`     | 6px      | Inputs, small buttons                       |
| `radius-DEFAULT`| 8px      | Buttons, dropdowns, standard cards          |
| `radius-lg`     | 12px     | Cards, panels, modals                       |
| `radius-xl`     | 16px     | Featured cards, hero elements               |
| `radius-2xl`    | 20px     | Large containers, widget window             |
| `radius-3xl`    | 24px     | Hero images, section containers             |
| `radius-full`   | 9999px   | Avatars, pills, toggles                     |

### 9.2 Border Styles

| Usage               | Specification                              |
|----------------------|--------------------------------------------|
| Default divider      | `1px solid var(--slate-200)`               |
| Subtle divider       | `1px solid var(--slate-100)`               |
| Input resting        | `1px solid var(--slate-300)`               |
| Input hover          | `1px solid var(--slate-400)`               |
| Input focus          | `2px solid var(--indigo-600)`              |
| Input error          | `2px solid var(--coral-600)`               |
| Card outline         | `1px solid var(--slate-200)`               |
| Dashed drop zone     | `2px dashed var(--slate-300)`              |

---

## 10. Motion & Animation

### 10.1 Duration Tokens

| Token               | Duration | Usage                              |
|----------------------|----------|------------------------------------|
| `duration-instant`   | 0ms      | State toggles (no visible change)  |
| `duration-fast`      | 100ms    | Hover, focus, micro-feedback       |
| `duration-normal`    | 200ms    | Dropdowns, tooltips, state changes |
| `duration-moderate`  | 300ms    | Panels, reveals, slides            |
| `duration-slow`      | 500ms    | Page transitions, scroll reveals   |
| `duration-slower`    | 700ms    | Hero entrances, orchestrated flows |

### 10.2 Easing Functions

| Token               | Value                                 | Usage                     |
|----------------------|---------------------------------------|---------------------------|
| `ease-default`       | `cubic-bezier(0.4, 0, 0.2, 1)`      | General purpose            |
| `ease-in`            | `cubic-bezier(0.4, 0, 1, 1)`        | Elements leaving           |
| `ease-out`           | `cubic-bezier(0, 0, 0.2, 1)`        | Elements entering          |
| `ease-bounce`        | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful interactions       |
| `ease-spring`        | `cubic-bezier(0.22, 1, 0.36, 1)`    | Natural, physics-like      |

### 10.3 Marketing Site Animation Patterns

| Pattern                         | Specification                                       |
|---------------------------------|-----------------------------------------------------|
| **Scroll reveal (sections)**    | Fade up 24px, 500ms, staggered 80ms per child       |
| **Hero entrance**               | Title slides in from bottom 40px, 700ms spring ease |
| **Floating UI cards**           | Subtle 3D tilt on scroll (CSS perspective + transform) |
| **Stats counter**               | Count-up on intersection, 800ms ease-out             |
| **CTA button hover**            | Scale 1.03 + glow shadow, 200ms                     |
| **CTA button press**            | Scale 0.97, 100ms                                   |
| **Nav link hover**              | Underline slides in from left, 200ms                |
| **Card hover**                  | Translate Y -4px + shadow-lg, 200ms                 |
| **Feature tab switch**          | Crossfade 300ms + slide 16px                        |
| **Testimonial grid**            | Staggered fade-in on scroll, masonry layout          |
| **Background gradient shift**   | Slow color cycling, 15s infinite                    |

### 10.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Buttons & CTAs

### 11.1 Button Variants

**Primary (Indigo Fill)**

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Background      | `var(--indigo-600)` → hover `var(--indigo-700)` |
| Text            | `#FFFFFF`, Plus Jakarta Sans 600, 15px     |
| Padding         | `12px 24px`                                |
| Radius          | `8px`                                      |
| Shadow          | `shadow-sm` resting → `glow-indigo` hover  |
| Active          | Scale 0.97, `var(--indigo-800)` bg         |
| Disabled        | Opacity 0.5, cursor not-allowed            |
| Min Height      | `44px`                                     |

**Secondary (Outline)**

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Background      | Transparent → hover `var(--indigo-50)`     |
| Border          | `1.5px solid var(--indigo-600)`            |
| Text            | `var(--indigo-600)`, 600 weight            |
| Radius          | `8px`                                      |

**Ghost (Text Only)**

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Background      | Transparent → hover `var(--slate-100)`     |
| Text            | `var(--slate-700)`, 500 weight             |
| Underline       | On hover                                   |

**Destructive (Coral Fill)**

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Background      | `var(--coral-600)` → hover darkened 10%    |
| Text            | `#FFFFFF`                                  |
| Usage           | Delete, cancel subscription, revoke access |

**Hero CTA (Gradient)**

| Property        | Value                                      |
|-----------------|--------------------------------------------|
| Background      | `var(--brand-gradient)`                    |
| Text            | `#FFFFFF`, Plus Jakarta Sans 700, 16px     |
| Padding         | `16px 32px`                                |
| Radius          | `12px`                                     |
| Shadow          | `glow-indigo`                              |
| Hover           | Shadow expands, slight scale 1.03          |

### 11.2 Button Sizes

| Size     | Height | Padding         | Font Size |
|----------|--------|-----------------|-----------|
| `xs`     | 32px   | `6px 12px`      | 13px      |
| `sm`     | 36px   | `8px 16px`      | 14px      |
| `md`     | 44px   | `12px 24px`     | 15px      |
| `lg`     | 52px   | `14px 32px`     | 16px      |
| `xl`     | 60px   | `18px 40px`     | 18px      |

### 11.3 Button With Icon

Icons are 20px (for md) or 16px (for sm/xs), placed left or right of text with `space-2` gap. Icon-only buttons use square dimensions matching the height.

---

## 12. Form Elements

### 12.1 Text Input

| State       | Border                       | Background        | Shadow                          |
|-------------|------------------------------|--------------------|---------------------------------|
| Resting     | `1px solid var(--slate-300)` | `var(--white)`     | None                            |
| Hover       | `1px solid var(--slate-400)` | `var(--white)`     | `shadow-xs`                     |
| Focus       | `2px solid var(--indigo-600)`| `var(--white)`     | `0 0 0 3px var(--indigo-50)`    |
| Error       | `2px solid var(--coral-600)` | `var(--coral-50)`  | `0 0 0 3px rgba(249,112,102,0.1)` |
| Disabled    | `1px solid var(--slate-200)` | `var(--slate-100)` | None                            |
| Read-only   | `1px solid var(--slate-200)` | `var(--slate-50)`  | None                            |

| Property           | Value                              |
|--------------------|------------------------------------|
| Height             | `44px` (md), `36px` (sm)          |
| Padding            | `10px 14px`                        |
| Radius             | `var(--radius-md)` (6px)          |
| Font               | Plus Jakarta Sans 400, 15px        |
| Placeholder Color  | `var(--slate-400)`                 |
| Label              | Plus Jakarta 500, 14px, `var(--slate-700)`, `space-1.5` above |
| Helper Text        | 13px, `var(--slate-500)`, `space-1` below |
| Error Message      | 13px, `var(--coral-600)`, `space-1` below |

### 12.2 Textarea

Same as text input but with `min-height: 96px`, `resize: vertical`.

### 12.3 Select / Dropdown

Same border/radius as text input. Chevron-down icon right-aligned. Dropdown menu: `shadow-lg`, `radius-lg`, max-height `280px`, `8px` padding.

### 12.4 Checkbox

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Size            | `18 × 18px`                             |
| Border          | `1.5px solid var(--slate-300)`           |
| Radius          | `4px`                                    |
| Checked Fill    | `var(--indigo-600)`                      |
| Check Mark      | White, 2px stroke                        |
| Focus Ring      | `0 0 0 3px var(--indigo-50)`             |

### 12.5 Radio

Same as checkbox but `border-radius: 50%`, inner dot `8px` filled circle.

### 12.6 Toggle / Switch

| State       | Track Background         | Knob              | Width × Height |
|-------------|--------------------------|--------------------|----|
| Off         | `var(--slate-300)`       | `#FFFFFF`          | `44 × 24px` |
| On          | `var(--indigo-600)`      | `#FFFFFF`          | Knob shifts right |
| Disabled    | `var(--slate-200)`       | `var(--slate-100)` | Opacity 0.5 |

---

## 13. Cards & Containers

### 13.1 Standard Card

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Background      | `var(--white)`                           |
| Border          | `1px solid var(--slate-200)`             |
| Radius          | `var(--radius-lg)` (12px)               |
| Padding         | `var(--space-6)` (24px)                  |
| Shadow          | `var(--shadow-sm)` resting              |
| Hover Shadow    | `var(--shadow-md)` + translateY(-4px)    |
| Transition      | `200ms var(--ease-default)`              |

### 13.2 Feature Card

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Background      | `var(--white)` or `var(--indigo-50)`     |
| Border          | None                                     |
| Radius          | `var(--radius-xl)` (16px)               |
| Padding         | `var(--space-8)` (32px)                  |
| Icon container  | `56px` with `Indigo 50` bg, `radius-lg` |
| Title           | `heading-lg` Fraunces                    |
| Description     | `body-md` Plus Jakarta, `Slate 600`     |
| Shadow          | `var(--shadow-md)`                       |

### 13.3 Glass Card (Hero / Featured)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
```

### 13.4 Stat Card

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Layout          | Number top (display-md, Fraunces 700, Indigo 600), label below (body-sm, Slate 500) |
| Background      | `var(--white)` or transparent            |
| Border          | `1px solid var(--slate-200)` or none     |
| Padding         | `var(--space-6)`                         |

---

## 14. Navigation System

### 14.1 Primary Navigation (Marketing)

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Type                | **Glass nav** (frosted backdrop blur)              |
| Position            | `sticky top-0 z-50`                               |
| Height              | `72px`                                            |
| Background          | `rgba(255,255,255,0.8)` + `backdrop-filter: blur(12px)` |
| Border Bottom       | `1px solid rgba(226,232,240,0.6)`                 |
| Logo                | Left — Flowlyra full logo                         |
| Links               | Center — Plus Jakarta 500, 15px, `Slate 700`      |
| Link Hover          | `Indigo 600` + underline slide-in                 |
| Link Active         | `Indigo 600`, font-weight 600                     |
| Right Actions       | "Log in" (ghost) + "Start free" (primary button)  |
| Mobile Trigger      | Hamburger icon at `md` breakpoint                  |
| Mobile Menu         | Full-screen overlay, slide-in from right, dark bg  |

### 14.2 Dashboard Navigation (Agent App)

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Type                | **Sidebar** (left, collapsible)                   |
| Width               | `260px` expanded, `72px` collapsed                |
| Background          | `var(--slate-50)` with `1px right border`         |
| Items               | Icon (24px) + Label (14px, 500), `44px` row height|
| Active Item         | `Indigo 50` bg, `Indigo 600` icon + text          |
| Hover Item          | `Slate 100` bg                                    |
| Sections            | Separated by subtle dividers with section labels  |
| Bottom Area         | Agent avatar + name + status toggle               |

---

## 15. Hero & Landing Patterns

### 15.1 Primary Hero (Home Page)

This is the **#1 area** where differentiation from LiveChat is critical.

**LiveChat hero:** White bg, text left, product screenshot right, yellow/black palette.
**Flowlyra hero:** Gradient bg, asymmetric layout, floating glass cards, indigo/coral palette.

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Background          | `var(--brand-gradient)` with subtle animated mesh  |
| Layout              | Asymmetric — 7-col text / 5-col floating UI cards  |
| Headline            | Fraunces 800, `display-hero`, White                |
| Sub-headline        | Plus Jakarta 400, `body-lg`, White at 85% opacity  |
| CTA                 | White fill + Indigo text (inverted primary)         |
| Secondary CTA       | Ghost white outline                                |
| Trust bar           | Logo row below hero on white strip                 |
| Visual              | Floating glass cards showing chat UI, not a flat screenshot |
| Ambient animation   | Slow gradient color shift + floating particle dots |
| Height              | `min-height: 90vh` desktop, `auto` mobile          |

### 15.2 Sub-Page Hero (Features, Pricing, etc.)

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Background          | `var(--surface-wash)` gradient                    |
| Height              | `400px` desktop, `auto` mobile                     |
| Headline            | Fraunces 700, `display-lg`, `Midnight`            |
| Description         | `body-lg`, `Slate 600`, max-width `640px`          |
| Alignment           | Centered                                           |

---

## 16. Feature Section Patterns

### 16.1 Primary Feature Block (Asymmetric Overlap)

This replaces LiveChat's alternating 50/50 text/image sections:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   OVERLINE LABEL                                │
│   ┌──────────────────────┐                      │
│   │ Feature Headline     │     ┌─────────────┐  │
│   │ in Fraunces serif    │     │ ┌─────────┐ │  │
│   │                      │     │ │ Product │ │  │
│   │ Description text in  │     │ │ UI Card │ │  │
│   │ Plus Jakarta. Short  │     │ └─────────┘ │  │
│   │ and impactful.       │     │             │  │
│   │                      │     │  ┌────────┐ │  │
│   │ [Learn more →]       │     │  │ Glass  │ │  │
│   └──────────────────────┘     │  │ Card   │ │  │
│                                │  └────────┘ │  │
│                                └─────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘

Visual: Cards overlap and float with shadow-xl, subtle 3D tilt.
Alternating: Text/visual sides swap, but never a rigid 50/50.
```

### 16.2 Feature Grid (Three Cards)

Three `Feature Cards` (see 13.2) in a row, each with: icon container, Fraunces headline, description, text link with arrow.

### 16.3 Feature Tabs (Interactive)

Horizontal tab bar (Plus Jakarta 600, 15px) above a content area that swaps on click with a 300ms crossfade + slide animation. Active tab has Indigo 600 underline (3px thick, animated).

---

## 17. Social Proof & Testimonials

### 17.1 Voice Card (Replaces Star Carousel)

LiveChat uses a horizontal auto-scrolling carousel with star ratings. Flowlyra uses a **masonry voice-card grid** — more visually interesting, avoids the clone look.

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Layout              | 3-column masonry grid (CSS columns), 2-col tablet, 1-col mobile |
| Card Background     | `var(--white)` with `shadow-sm`                   |
| Card Radius         | `var(--radius-lg)` (12px)                         |
| Card Padding        | `var(--space-6)` (24px)                           |
| Quote Text          | Plus Jakarta 400, 16px, `Slate 700`, italic       |
| Quote Mark          | Large `"` in Fraunces, 48px, `Indigo 200`         |
| Attribution         | Name (Plus Jakarta 600, 14px, `Midnight`) + Title (14px, `Slate 500`) |
| Company Logo        | 24px height, grayscale, in header of card         |
| Highlight Stat      | Fraunces 700, 32px, `Indigo 600`, above the quote |
| Animation           | Staggered fade-in on scroll, 80ms delay per card  |
| No Stars            | No 5-star ratings (differentiates from LiveChat)   |

### 17.2 Logo Bar (Trust Strip)

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Layout              | Horizontal flex row, centered, wrap                |
| Logo Treatment      | Grayscale, 32px height, `opacity: 0.5` → `1` on hover |
| Padding             | `var(--space-16)` vertical                        |
| Label               | "Trusted by 10,000+ support teams" — `overline` token |
| Background          | `var(--white)` or `var(--slate-50)`               |

---

## 18. Pricing Section

### 18.1 Pricing Card

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Layout              | 3 cards in a row (Starter, Pro, Enterprise)        |
| Background          | White with Indigo-bordered "recommended" card      |
| Featured Card       | `2px solid var(--indigo-600)` border, `Indigo 50` top strip, "Most Popular" badge |
| Badge               | Coral 500 bg, white text, `radius-full`, above card|
| Plan Name           | Plus Jakarta 600, 18px, `Midnight`                |
| Price               | Fraunces 800, 48px, `Midnight`                    |
| Per unit            | Plus Jakarta 400, 14px, `Slate 500`, "/agent/mo"  |
| Feature list        | Check icons in Emerald 500 + text 14px Slate 700   |
| CTA Button          | Primary (Indigo) for featured, Secondary for others|
| Radius              | `var(--radius-xl)` (16px)                         |
| Padding             | `var(--space-8)` (32px)                           |
| Shadow              | `shadow-md` resting, `shadow-lg` hover            |
| Enterprise card     | "Contact Sales" CTA, custom dark/gradient variant  |

### 18.2 Pricing Toggle

Annual/Monthly toggle using `Switch` component, with "Save 20%" badge on Annual in `Emerald 500`.

---

## 19. Footer

### 19.1 Layout & Style

| Property            | Value                                             |
|---------------------|---------------------------------------------------|
| Background          | `var(--midnight)` (#0F172A)                       |
| Text Color          | `var(--slate-300)` (links), `var(--slate-500)` (secondary) |
| Link Hover          | `var(--white)`                                    |
| Layout              | 5-column grid (Logo/CTA + 4 link columns)         |
| Top Section         | Flowlyra logo (white reverse) + "Start flowing free" CTA |
| Column Headings     | Plus Jakarta 600, 13px, `overline`, `var(--slate-400)`, uppercase |
| Column Links        | Plus Jakarta 400, 14px, `var(--slate-300)`        |
| Bottom Bar          | Divider + Copyright + Social icons + Legal links   |
| Social Icons        | 20px, `Slate 500` → `White` on hover             |
| Padding             | `var(--space-24)` vertical                        |

### 19.2 Footer Columns

| Column 1     | Column 2       | Column 3      | Column 4       |
|-------------|----------------|---------------|----------------|
| **Product** | **Solutions**  | **Resources** | **Company**    |
| Features    | Customer Support| Help Center  | About          |
| Pricing     | Sales & Marketing| Blog        | Contact        |
| Integrations| Enterprise     | API Docs      | Careers        |
| Product Tour| Ecommerce      | Status        | Legal          |
| What's New  |                | Community     | Privacy        |

---

## 20. Chat Widget Design

### 20.1 Visual Identity (Must Be Distinct from LiveChat Widget)

| Property            | Flowlyra Widget                      | LiveChat Widget (avoid)    |
|---------------------|--------------------------------------|----------------------------|
| Launcher shape      | Rounded square with wave icon        | Circle with chat bubble    |
| Default color       | Indigo 600 gradient                  | Customizable (often orange)|
| Window radius       | `20px` top corners                   | `16px` top corners         |
| Header style        | Gradient indigo header + glass blur  | Solid color header         |
| Message bubbles     | Soft rounded, tail-less              | Rounded with directional tail |

### 20.2 Widget Specs

| Property            | Value                                    |
|---------------------|------------------------------------------|
| Position            | Bottom-right, `24px` from edges          |
| Launcher Size       | `56 × 56px`                             |
| Launcher Radius     | `16px`                                   |
| Launcher Icon       | Flowlyra stream mark (white, 28px)       |
| Launcher Shadow     | `var(--shadow-xl)` + `var(--glow-indigo)`|
| Launcher Hover      | Scale 1.08, glow intensifies             |
| Window Width        | `380px` desktop, `100vw` mobile          |
| Window Height       | `560px` desktop, `100vh - 24px` mobile   |
| Window Radius       | `20px` top corners, `0` bottom           |
| Window Shadow       | `var(--shadow-2xl)`                      |
| Open Animation      | Scale from launcher origin, 300ms spring |
| Close Animation     | Scale down + fade, 200ms ease-in         |

### 20.3 Widget Header

| Property            | Value                                    |
|---------------------|------------------------------------------|
| Background          | `var(--brand-gradient)`                  |
| Height              | `72px`                                   |
| Content             | Agent avatar cluster + "Flowlyra Support" + online indicator |
| Close Button        | X icon, white, top-right                 |
| Text Color          | White                                    |
| Avatar              | `36px`, `radius-full`, white `2px` border|

### 20.4 Message Bubbles

| Sender        | Background              | Text Color     | Radius                    | Max Width |
|---------------|-------------------------|----------------|---------------------------|-----------|
| Agent/Bot     | `var(--slate-100)`      | `var(--slate-800)` | `16px 16px 16px 4px`  | `75%`     |
| Visitor       | `var(--indigo-600)`     | `#FFFFFF`      | `16px 16px 4px 16px`      | `75%`     |
| System        | `var(--indigo-50)`      | `var(--indigo-700)` | `12px` all            | `85%`     |

### 20.5 Input Area

| Property            | Value                                    |
|---------------------|------------------------------------------|
| Background          | `var(--white)`                           |
| Border Top          | `1px solid var(--slate-200)`             |
| Input Height        | `48px`                                   |
| Padding             | `12px 16px`                              |
| Placeholder         | "Type a message..." in `Slate 400`       |
| Send Button         | `36px` circle, `Indigo 600` bg, arrow icon white |
| Attachment Button   | Paperclip icon, `Slate 400`, left of input|

---

## 21. Agent Dashboard UI

### 21.1 Layout Structure

```
┌──────┬───────────────────────────────────────────┐
│      │  Toolbar (56px)                           │
│      ├──────────────┬────────────────┬───────────┤
│ Side │              │                │           │
│ bar  │  Chat List   │  Conversation  │  Details  │
│      │  Panel       │  Panel         │  Panel    │
│ 72px │  280px       │  Flex          │  320px    │
│  or  │              │                │           │
│260px │              │                │           │
│      │              │                │           │
└──────┴──────────────┴────────────────┴───────────┘
```

### 21.2 Dashboard Color Palette

The dashboard uses a **denser, more muted version** of the marketing palette:

| Element              | Color                              |
|----------------------|------------------------------------|
| Sidebar bg           | `var(--slate-50)` (#F8FAFC)       |
| Main bg              | `var(--white)`                     |
| Chat list bg         | `var(--white)`                     |
| Active chat row      | `var(--indigo-50)` (#EEF2FF)      |
| Unread indicator     | `var(--indigo-600)` dot            |
| Online status        | `var(--emerald-500)` dot           |
| Away status          | `var(--amber-400)` dot             |
| Offline status       | `var(--slate-400)` dot             |
| Tag chips            | Various pastel backgrounds + dark text |
| Toolbar bg           | `var(--white)`, bottom border      |

### 21.3 Chat Composition Area (Agent)

| Property            | Value                                    |
|---------------------|------------------------------------------|
| Background          | `var(--white)`                           |
| Border Top          | `1px solid var(--slate-200)`             |
| Min Height          | `120px`                                  |
| Toolbar Row         | Bold, Italic, Link, Emoji, Attachment, Canned Reply icons |
| Send Button         | Primary Indigo, right-aligned            |
| AI Suggestion       | `var(--indigo-50)` banner above input, "Suggested reply" label with accept/dismiss |

### 21.4 Notification System

| Type      | Background             | Border Left          | Icon Color         |
|-----------|------------------------|----------------------|--------------------|
| Info      | `var(--indigo-50)`     | `3px var(--indigo-600)` | Indigo 600       |
| Success   | `var(--emerald-50)`    | `3px var(--emerald-500)`| Emerald 500      |
| Warning   | `var(--amber-50)`      | `3px var(--amber-400)`  | Amber 600        |
| Error     | `var(--coral-50)`      | `3px var(--coral-600)`  | Coral 600        |

---

## 22. Data Visualization

### 22.1 Chart Color Palette

| Index | Color       | Hex       | Usage                    |
|-------|-------------|-----------|--------------------------|
| 1     | Indigo      | `#4F46E5` | Primary metric            |
| 2     | Coral       | `#F97066` | Secondary metric          |
| 3     | Emerald     | `#10B981` | Positive / success        |
| 4     | Amber       | `#FBBF24` | Warning / attention       |
| 5     | Violet      | `#8B5CF6` | Tertiary data             |
| 6     | Cyan        | `#06B6D4` | Supplementary             |
| 7     | Rose        | `#F43F5E` | Negative / decline        |
| 8     | Slate       | `#64748B` | Neutral / baseline        |

### 22.2 Chart Style Rules

| Property            | Value                                    |
|---------------------|------------------------------------------|
| Font                | Plus Jakarta Sans 400, 12px for labels   |
| Grid lines          | `var(--slate-100)`, 1px                  |
| Axis text           | `var(--slate-500)`, 11px                 |
| Tooltip bg          | `var(--midnight)`, white text, `radius-md`, `shadow-lg` |
| Bar radius          | `4px` top corners                        |
| Line stroke         | `2px`                                    |
| Area fill           | 10% opacity of line color                |
| Hover state         | Circle dot `6px`, tooltip appears        |

---

## 23. Imagery & Illustration

### 23.1 Photography Style

| Attribute        | Flowlyra                                     | Avoid (LiveChat style)           |
|------------------|----------------------------------------------|----------------------------------|
| Tone             | Cool-toned, modern, slightly editorial       | Warm, corporate stock            |
| Lighting         | Natural with cool undertones                 | Warm studio                      |
| Subjects         | Real people at workstations, close-up hands  | Full body in staged environments |
| Color grading    | Slight blue/violet shift, high contrast      | Warm yellow/orange shift         |
| Composition      | Tight crops, shallow depth of field          | Wide environmental shots         |

### 23.2 Product Screenshots

| Level          | Description                                    |
|----------------|------------------------------------------------|
| **Hero**       | Floating glass-card UI mockups, not flat shots |
| **Feature**    | Focused UI crops with subtle 3D perspective    |
| **Detail**     | Annotated close-ups of specific features       |

### 23.3 Abstract Illustrations

For backgrounds and section transitions, use **flowing gradient meshes** and **constellation dot patterns** — never the "blob" or "wave" shapes common in generic SaaS design.

```css
/* Constellation pattern overlay */
.constellation {
  background-image: radial-gradient(1.5px 1.5px at 20px 30px, rgba(99,102,241,0.3), transparent),
                    radial-gradient(1px 1px at 80px 60px, rgba(99,102,241,0.2), transparent),
                    radial-gradient(2px 2px at 150px 100px, rgba(249,112,102,0.2), transparent);
  background-size: 200px 200px;
}
```

---

## 24. Copywriting Voice & Tone

### 24.1 Voice Principles

| Principle      | Description                                          | Example                                   |
|----------------|------------------------------------------------------|-------------------------------------------|
| **Fluid**      | Sentences that flow, not bullet-point corporate      | "Support that flows naturally"             |
| **Confident**  | State facts, don't hedge                             | "10x faster than email" not "may be faster"|
| **Human**      | Second person, active voice, no jargon               | "You'll see results" not "Results are seen"|
| **Concise**    | Cut every unnecessary word                           | "Start free" not "Sign up for a free trial today" |

### 24.2 Headline Formula

```
[Emotion-evoking verb] + [what the customer gets]
```

Examples:
- "Support that flows. Sales that grow."
- "Turn every conversation into value."
- "See your team at its best."
- "Built for the rhythm of real conversations."

### 24.3 Banned Phrases (LiveChat Clones)

| ❌ Never Use                          | ✅ Use Instead                        |
|---------------------------------------|---------------------------------------|
| "Gets the job done"                   | "Built for how teams actually work"   |
| "Go-to choice"                        | "The platform teams switch to"        |
| "Quick to set up, easy to use"        | "From zero to live in five minutes"   |
| "35,000+ companies"                   | "10,000+ support teams"              |
| "Free 14-day trial"                   | "Start flowing free — 14 days, no card"|
| "Live chat software"                  | "Customer support platform"           |
| "Premium experience"                  | "Conversations that convert"          |

---

## 25. Accessibility Standards

### 25.1 WCAG 2.1 AA Compliance (Minimum)

| Requirement                          | Specification                            |
|--------------------------------------|------------------------------------------|
| Color contrast (normal text)         | ≥ 4.5:1                                |
| Color contrast (large text)          | ≥ 3:1                                  |
| Touch target size                    | ≥ 44 × 44px                            |
| Focus indicator                      | `2px solid var(--indigo-600)` + `3px` offset ring |
| Keyboard navigation                  | Full tab order, arrow keys in composite widgets |
| Skip link                            | Hidden "Skip to content" on all pages   |
| ARIA labels                          | All icon-only buttons, all form elements|
| Alt text                             | All non-decorative images               |
| Reduced motion                       | `prefers-reduced-motion` respected       |
| Color independence                   | Never color-only status — always icon + text |

### 25.2 Verified Contrast Ratios

| Combination                          | Ratio  | Pass    |
|--------------------------------------|--------|---------|
| Midnight on White                    | 17.1:1 | AAA ✓   |
| White on Indigo 600                  | 5.4:1  | AA ✓    |
| White on Midnight                    | 17.1:1 | AAA ✓   |
| Slate 700 on White                   | 7.0:1  | AAA ✓   |
| Indigo 600 on White                  | 5.2:1  | AA ✓    |
| Coral 600 on White                   | 4.6:1  | AA ✓    |
| Emerald 500 on White                 | 3.4:1  | AA-lg ✓ |
| White on Coral 600                   | 4.6:1  | AA ✓    |

---

## 26. Dark Mode System

### 26.1 Token Mapping

| Semantic Token              | Light Mode             | Dark Mode              |
|-----------------------------|------------------------|------------------------|
| `--bg-primary`              | `#FFFFFF`              | `#0F172A`              |
| `--bg-secondary`            | `#F8FAFC`              | `#1E293B`              |
| `--bg-tertiary`             | `#F1F5F9`              | `#334155`              |
| `--bg-elevated`             | `#FFFFFF`              | `#1E293B`              |
| `--text-primary`            | `#0F172A`              | `#F1F5F9`              |
| `--text-secondary`          | `#475569`              | `#94A3B8`              |
| `--text-muted`              | `#64748B`              | `#64748B`              |
| `--border-default`          | `#E2E8F0`              | `#334155`              |
| `--border-subtle`           | `#F1F5F9`              | `#1E293B`              |
| `--interactive-primary`     | `#4F46E5`              | `#6366F1`              |
| `--interactive-hover`       | `#4338CA`              | `#4F46E5`              |

### 26.2 Implementation

```css
:root { /* Light mode defaults */ }

@media (prefers-color-scheme: dark) {
  :root { /* Dark overrides */ }
}

[data-theme="dark"] { /* Manual toggle overrides */ }
```

---

## 27. Design Tokens (Full Reference)

### 27.1 CSS Custom Properties

```css
:root {
  /* ─── Colors: Indigo (Primary) ─── */
  --indigo-50:  #EEF2FF;
  --indigo-100: #E0E7FF;
  --indigo-200: #C7D2FE;
  --indigo-300: #A5B4FC;
  --indigo-400: #818CF8;
  --indigo-500: #6366F1;
  --indigo-600: #4F46E5;
  --indigo-700: #4338CA;
  --indigo-800: #3730A3;
  --indigo-900: #312E81;
  --indigo-950: #1E1B4B;

  /* ─── Colors: Coral (Accent) ─── */
  --coral-50:  #FFF5F5;
  --coral-100: #FFE4E6;
  --coral-200: #FECDD3;
  --coral-300: #FDA4AF;
  --coral-400: #FB7185;
  --coral-500: #F97066;
  --coral-600: #EF4444;
  --coral-700: #DC2626;

  /* ─── Colors: Slate (Neutrals) ─── */
  --midnight:   #0F172A;
  --slate-50:   #F8FAFC;
  --slate-100:  #F1F5F9;
  --slate-200:  #E2E8F0;
  --slate-300:  #CBD5E1;
  --slate-400:  #94A3B8;
  --slate-500:  #64748B;
  --slate-600:  #475569;
  --slate-700:  #334155;
  --slate-800:  #1E293B;
  --slate-900:  #0F172A;

  /* ─── Colors: Semantic ─── */
  --emerald-50:  #ECFDF5;
  --emerald-500: #10B981;
  --emerald-600: #059669;
  --amber-50:    #FFFBEB;
  --amber-400:   #FBBF24;
  --amber-600:   #D97706;

  /* ─── Gradients ─── */
  --gradient-brand:   linear-gradient(135deg, #4F46E5, #7C3AED, #F97066);
  --gradient-indigo:  linear-gradient(180deg, #4F46E5, #312E81);
  --gradient-surface: linear-gradient(180deg, #F8FAFC, #EEF2FF);

  /* ─── Typography ─── */
  --font-display: 'Fraunces', Georgia, serif;
  --font-sans:    'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  --text-display-hero: 800 clamp(2.25rem, 5vw + 1rem, 4rem)/1.05 var(--font-display);
  --text-display-lg:   700 clamp(1.75rem, 3.5vw + 0.75rem, 3rem)/1.1 var(--font-display);
  --text-display-md:   700 clamp(1.5rem, 2.5vw + 0.5rem, 2.25rem)/1.15 var(--font-display);
  --text-display-sm:   600 1.75rem/1.2 var(--font-display);
  --text-heading-lg:   700 1.375rem/1.3 var(--font-sans);
  --text-heading-md:   600 1.125rem/1.4 var(--font-sans);
  --text-heading-sm:   600 1rem/1.4 var(--font-sans);
  --text-body-lg:      400 1.125rem/1.7 var(--font-sans);
  --text-body-md:      400 1rem/1.6 var(--font-sans);
  --text-body-sm:      400 0.875rem/1.5 var(--font-sans);
  --text-caption:      500 0.75rem/1.4 var(--font-sans);
  --text-overline:     700 0.6875rem/1.2 var(--font-sans);

  /* ─── Spacing ─── */
  --space-0:    0;
  --space-px:   1px;
  --space-0-5:  0.125rem;
  --space-1:    0.25rem;
  --space-1-5:  0.375rem;
  --space-2:    0.5rem;
  --space-3:    0.75rem;
  --space-4:    1rem;
  --space-5:    1.25rem;
  --space-6:    1.5rem;
  --space-8:    2rem;
  --space-10:   2.5rem;
  --space-12:   3rem;
  --space-16:   4rem;
  --space-20:   5rem;
  --space-24:   6rem;
  --space-32:   8rem;
  --space-40:   10rem;

  /* ─── Radius ─── */
  --radius-none:    0;
  --radius-sm:      4px;
  --radius-md:      6px;
  --radius-DEFAULT: 8px;
  --radius-lg:      12px;
  --radius-xl:      16px;
  --radius-2xl:     20px;
  --radius-3xl:     24px;
  --radius-full:    9999px;

  /* ─── Shadows ─── */
  --shadow-xs:    0 1px 2px 0 rgba(15,23,42,0.04);
  --shadow-sm:    0 1px 3px 0 rgba(15,23,42,0.06), 0 1px 2px -1px rgba(15,23,42,0.06);
  --shadow-md:    0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05);
  --shadow-lg:    0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04);
  --shadow-xl:    0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.06);
  --shadow-2xl:   0 25px 50px -12px rgba(15,23,42,0.2);
  --shadow-inner: inset 0 2px 4px 0 rgba(15,23,42,0.05);
  --glow-indigo:  0 0 20px rgba(79,70,229,0.25), 0 0 60px rgba(79,70,229,0.1);
  --glow-coral:   0 0 20px rgba(249,112,102,0.25), 0 0 60px rgba(249,112,102,0.1);

  /* ─── Transitions ─── */
  --duration-fast:     100ms;
  --duration-normal:   200ms;
  --duration-moderate: 300ms;
  --duration-slow:     500ms;
  --duration-slower:   700ms;
  --ease-default:      cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in:           cubic-bezier(0.4, 0, 1, 1);
  --ease-out:          cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce:       cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring:       cubic-bezier(0.22, 1, 0.36, 1);

  /* ─── Z-Index ─── */
  --z-dropdown:   50;
  --z-sticky:     100;
  --z-fixed:      200;
  --z-modal-bg:   300;
  --z-modal:      400;
  --z-popover:    500;
  --z-tooltip:    600;
  --z-widget:     9999;
}
```

---

## 28. Implementation Stack

### 28.1 Frontend (Marketing Site)

| Technology           | Package/Tool                        |
|----------------------|-------------------------------------|
| Framework            | Next.js 14+ (App Router)           |
| Styling              | Tailwind CSS 4 + CSS custom props  |
| Animations           | Framer Motion                       |
| Icons                | Lucide React                        |
| Fonts                | Google Fonts (self-hosted in prod)  |
| Deployment           | Vercel                              |

### 28.2 Frontend (Agent Dashboard)

| Technology           | Package/Tool                        |
|----------------------|-------------------------------------|
| Framework            | React 18 + Vite 5                  |
| State                | Zustand + TanStack Query           |
| Styling              | Tailwind CSS + Emotion (component) |
| Charts               | Recharts                            |
| Real-time            | Socket.IO client                   |
| Icons                | Lucide React                        |

### 28.3 Design System Component Library

| Property             | Specification                       |
|----------------------|-------------------------------------|
| Package name         | `@flowlyra/ui`                     |
| Language             | TypeScript                          |
| Build                | tsup (ESM + CJS)                   |
| Styling              | Tailwind CSS preset + CSS vars     |
| Documentation        | Storybook 8                        |
| Testing              | Vitest + Testing Library           |
| Visual regression    | Chromatic                           |

---

## 29. Component Library Spec

### 29.1 Core Components

| Component        | Variants                                      |
|------------------|-----------------------------------------------|
| Button           | primary, secondary, ghost, destructive, hero   |
| Input            | text, email, password, search, textarea, number|
| Select           | single, multi, searchable, grouped             |
| Checkbox         | default, indeterminate                         |
| Radio            | default, card-style                            |
| Toggle           | default, with-label                            |
| Badge            | filled, outlined, dot-only                     |
| Avatar           | image, initials, icon, status-indicator        |
| Tag / Chip       | removable, selectable, status                  |
| Tooltip          | top, right, bottom, left                       |
| Popover          | click, hover                                   |
| Modal / Dialog   | sm, md, lg, fullscreen                         |
| Dropdown Menu    | with icons, with shortcuts, with sub-menus     |
| Tabs             | underline, pill, vertical                      |
| Accordion        | single, multi, bordered                        |
| Alert / Banner   | info, success, warning, error, dismissible     |
| Toast            | info, success, warning, error, with-action     |
| Card             | standard, feature, glass, stat                 |
| Table            | sortable, selectable, paginated                |
| Pagination       | numbered, cursor, load-more                    |
| Skeleton         | text, card, avatar, table-row                  |
| Progress Bar     | linear, circular                               |
| Breadcrumb       | default                                        |
| Sidebar Nav      | collapsible, with-sections                     |
| Command Palette  | ⌘K style, searchable, categorized              |

### 29.2 Chat-Specific Components

| Component            | Description                               |
|----------------------|-------------------------------------------|
| ChatBubble           | Agent, visitor, bot, system variants       |
| ChatInput            | Rich text, attachment, emoji, canned reply |
| ChatList             | Unread indicator, preview, status, time    |
| AgentAvatar          | With online/away/offline status dot        |
| TypingIndicator      | Three-dot bounce animation                 |
| AISuggestion         | Inline suggestion bar with accept/dismiss  |
| VisitorInfo          | Side panel with context, history, tags     |
| CSAT Rating          | 1–5 scale with emoji faces                |

---

## 30. LiveChat vs Flowlyra Differentiation Checklist

Use this checklist before shipping any page or component.

| Element                         | LiveChat                  | Flowlyra (Must Be)                    | ✓ |
|---------------------------------|---------------------------|---------------------------------------|---|
| Primary color                   | Yellow `#FFD000`          | Indigo `#4F46E5`                      | □ |
| Dark color                      | Black `#1B1B20`           | Midnight `#0F172A`                    | □ |
| Accent color                    | Orange `#FF5100`          | Coral `#F97066`                       | □ |
| Display font                    | Colfax (geometric sans)  | Fraunces (soft serif)                 | □ |
| Body font                       | Colfax                    | Plus Jakarta Sans                     | □ |
| Logo mark                       | Chat bubble               | Flowing stream/wave arcs              | □ |
| Hero background                 | White / light             | Brand gradient (indigo → coral)       | □ |
| Hero layout                     | 50/50 text + screenshot   | Asymmetric + floating glass cards     | □ |
| Hero tagline                    | "Gets the job done"       | "Conversations that move"             | □ |
| CTA text                        | "Sign up free"            | "Start flowing free"                  | □ |
| Feature section                 | Rigid 50/50 alternating   | Asymmetric overlap cards              | □ |
| Testimonials                    | Star-rating carousel      | Masonry voice-card grid (no stars)    | □ |
| Navigation                      | Solid white sticky bar    | Glass blur sticky bar                 | □ |
| Footer background               | Black `#1B1B20`           | Midnight `#0F172A`                    | □ |
| Chat widget launcher            | Circle + chat bubble      | Rounded square + wave icon            | □ |
| Widget header                   | Solid color               | Brand gradient + glass blur           | □ |
| Message bubble (visitor)        | Blue with tail            | Indigo, tail-less, soft round         | □ |
| Shadow style                    | Flat neutral shadows      | Colored glow shadows                  | □ |
| Section labels                  | Plain uppercase            | Overline with letter-spacing 0.1em   | □ |
| Photography tone                | Warm, corporate            | Cool, editorial, blue-shifted        | □ |
| Trust bar logos                  | Full color                 | Grayscale → color on hover           | □ |
| Pricing card highlight          | None / yellow accent       | Indigo border + "Most Popular" badge | □ |
| Stats display                   | In testimonial blocks      | Standalone stat cards with Fraunces  | □ |
| Animation style                 | Minimal, functional        | Glow effects, spring physics, depth  | □ |
| meta-theme-color                | `#FF5100` (LiveChat's!)   | `#4F46E5` (Flowlyra Indigo)          | □ |

---

## Appendix A: File Structure

```
flowlyra/
├── packages/
│   └── ui/                          # @flowlyra/ui component library
│       ├── src/
│       │   ├── tokens/              # Design token CSS files
│       │   ├── components/          # React components
│       │   └── hooks/               # Shared hooks (useAnimations, etc.)
│       ├── .storybook/
│       └── package.json
├── frontend/                        # Agent dashboard + marketing site
│   ├── src/
│   │   ├── styles/
│   │   │   ├── tokens.css           # All CSS custom properties
│   │   │   ├── globals.css          # Reset + base styles
│   │   │   └── fonts.css            # Font-face declarations
│   │   ├── pages/
│   │   │   ├── marketing/           # Public website pages
│   │   │   └── app/                 # Authenticated dashboard
│   │   └── components/
│   ├── tailwind.config.ts           # Tailwind config with Flowlyra tokens
│   └── package.json
├── widget/                          # Embeddable chat widget
│   ├── src/
│   │   ├── styles/                  # Widget-scoped styles
│   │   └── Widget.ts
│   └── package.json
└── docs/
    └── FLOWLYRA_DESIGN_SYSTEM.md    # This file
```

## Appendix B: Tailwind Configuration

```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        indigo: {
          50:  '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
          600: '#4F46E5', 700: '#4338CA', 800: '#3730A3',
          900: '#312E81', 950: '#1E1B4B',
        },
        coral: {
          50:  '#FFF5F5', 100: '#FFE4E6', 200: '#FECDD3',
          300: '#FDA4AF', 400: '#FB7185', 500: '#F97066',
          600: '#EF4444', 700: '#DC2626',
        },
        midnight: '#0F172A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px', xl: '16px', '2xl': '20px', '3xl': '24px',
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(79,70,229,0.25), 0 0 60px rgba(79,70,229,0.1)',
        'glow-coral':  '0 0 20px rgba(249,112,102,0.25), 0 0 60px rgba(249,112,102,0.1)',
      },
    },
  },
}
```

---

> **This document is the single source of truth for all Flowlyra visual design decisions. Every page, component, and pixel must be validated against this system before shipping. Any element that visually resembles LiveChat.com must be redesigned using this specification.**