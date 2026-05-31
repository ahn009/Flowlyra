/**
 * Marketing sub-pages: Features, Solutions (Support + Sales),
 * Integrations, Customers. All share SubPageLayout (§15.2 hero).
 */
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle,
  Eye,
  Globe,
  Headphones,
  Inbox,
  Link2,
  LineChart,
  MessageCircle,
  MessageSquareText,
  Search,
  Shield,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingNavigation } from "../components/MarketingNavigation";
import { cx } from "../components/ui";

/* ─── Design tokens ─── */
const OVERLINE = "font-sans text-[11px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-indigo-600";
const DISPLAY_LG = "font-display text-[clamp(1.75rem,3.5vw+0.75rem,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-midnight";
const DISPLAY_MD = "font-display text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-midnight";
const BODY_LG = "font-sans text-base leading-[1.7] text-slate-600 sm:text-lg";

/* ─── Scroll-reveal hook ─── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { node.classList.add("is-visible"); obs.disconnect(); } },
      { threshold: 0.12 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── Shared footer ─── */
const FOOTER_COLS = [
  { title: "Product",   links: [{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/integrations", label: "Integrations" }, { to: "/product-tour", label: "Product Tour" }] },
  { title: "Solutions", links: [{ to: "/solutions/customer-support", label: "Customer Support" }, { to: "/solutions/sales-marketing", label: "Sales & Marketing" }, { to: "/solutions/enterprise", label: "Enterprise" }] },
  { title: "Resources", links: [{ to: "/help", label: "Help Center" }, { to: "/blog", label: "Blog" }, { to: "/status", label: "Status" }, { to: "/contact", label: "Contact" }] },
  { title: "Company",  links: [{ to: "/customers", label: "About" }, { to: "/terms", label: "Legal" }, { to: "/privacy", label: "Privacy" }] },
];

function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#0F172A] text-slate-300">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-5">
        {/* Brand col */}
        <div className="lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Flowlyra home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <svg viewBox="0 0 36 36" aria-hidden="true" className="h-7 w-7">
                <path d="M7 14.5C10.2 8.8 17.7 7.8 22.1 11.8l2.1 1.9c1.7 1.5 4.1 1.2 5.8-.6" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" />
                <path d="M6 22.2c3.5 5.4 11.2 6.2 15.4 1.9l2.2-2.2c1.6-1.6 4.2-1.5 6.2.2" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-sans text-xl font-semibold text-white">Flowlyra</span>
          </Link>
          <p className="mt-3 text-sm text-slate-400">Conversations that move.</p>
        </div>
        {/* Link columns */}
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-400">{col.title}</h3>
            <nav className="mt-5 grid gap-0" aria-label={col.title}>
              {col.links.map((link) => (
                <Link key={link.label} to={link.to} className="flex min-h-8 items-center text-sm text-slate-300 transition-colors hover:text-white">{link.label}</Link>
              ))}
            </nav>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-slate-500">&copy; {new Date().getFullYear()} Flowlyra. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Sub-page hero (§15.2) ─── */
function SubPageHero({ headline, description }: { headline: string; description: string }) {
  return (
    <section
      className="border-b border-slate-200"
      style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)", minHeight: 320 }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className={cx(DISPLAY_LG, "max-w-3xl")}>{headline}</h1>
        <p className={cx(BODY_LG, "mx-auto mt-5 max-w-[640px]")}>{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-indigo-600 px-7 py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-glow-indigo active:scale-[0.97]"
          >
            Start flowing free
          </Link>
          <Link
            to="/product-tour"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-7 py-3 text-[15px] font-medium text-slate-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.97]"
          >
            View demo
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Sub-page layout wrapper ─── */
function SubPageLayout({ headline, description, children }: { headline: string; description: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-midnight">
      <MarketingNavigation />
      <main>
        <SubPageHero headline={headline} description={description} />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/* ─── CTA banner ─── */
function CTABanner() {
  const ref = useReveal();
  return (
    <section ref={ref as React.Ref<HTMLElement>} className="reveal-on-scroll mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div
        className="overflow-hidden rounded-3xl px-8 py-12 text-white sm:px-12"
        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED, #F97066)" }}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] sm:text-[2.25rem]">
              Ready to start flowing?
            </h2>
            <p className="mt-3 max-w-lg text-base text-white/80">
              Join 10,000+ support teams. No credit card required.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-indigo-700 transition-all hover:bg-indigo-50 active:scale-[0.97]"
            >
              Start flowing free
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.97]"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Asymmetric feature block with checklist (§16.1) ─── */
interface FeatureBlockData {
  overline: string;
  headline: string;
  checks: string[];
  visual: "chat" | "ai" | "analytics" | "inbox" | "routing" | "leads";
  reverse?: boolean;
  bg?: string;
}

function FeatureBlockVisual({ type }: { type: FeatureBlockData["visual"] }) {
  const cards: Record<FeatureBlockData["visual"], React.ReactNode> = {
    chat: (
      <div className="hero-glass-card space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-midnight"><span className="h-2 w-2 rounded-full bg-emerald-500" /> 3 agents online</div>
        <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700">Hi! Do you ship internationally?</div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm text-white">Yes! We ship to 40+ countries.</div>
        <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700">That's great, can I see shipping times?</div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400"><span className="italic">Agent is typing</span> <span className="animate-pulse">...</span></div>
      </div>
    ),
    ai: (
      <div className="hero-glass-card space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm">
          <Sparkles size={14} className="shrink-0 text-indigo-600" />
          <span className="font-semibold text-indigo-600">Suggested reply</span>
          <span className="ml-auto cursor-pointer rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">Accept</span>
        </div>
        <p className="text-sm text-slate-600 italic">"Happy to help with that! Our Pro plan includes unlimited agents and AI suggestions. You can start a 14-day trial…"</p>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-medium">Sentiment: positive</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 font-medium">Tag: billing</span>
        </div>
      </div>
    ),
    analytics: (
      <div className="hero-glass-card space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last 30 days</p>
        <div className="grid grid-cols-2 gap-3">
          {[["2,847", "Chats"], ["28s", "Avg response"], ["4.6/5", "CSAT"], ["94%", "Resolution"]].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-white px-3 py-2 shadow-xs">
              <div className="font-display text-xl font-bold text-midnight">{v}</div>
              <div className="text-xs text-slate-500">{l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 pt-1" style={{ height: 40 }}>
          {[40, 55, 35, 65, 50, 70, 60, 80, 55, 75, 65, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[2px] bg-indigo-600/80" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
    inbox: (
      <div className="hero-glass-card space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unified inbox</p>
        {[{ name: "Sarah K.", msg: "Need help with my order…", time: "2m", dot: "bg-indigo-600" }, { name: "James T.", msg: "Shipping question", time: "5m", dot: "bg-emerald-500" }, { name: "Priya N.", msg: "Refund request", time: "12m", dot: "bg-slate-300" }].map((row) => (
          <div key={row.name} className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-midnight">{row.name}</p>
              <p className="truncate text-xs text-slate-500">{row.msg}</p>
            </div>
            <span className="text-xs text-slate-400">{row.time}</span>
          </div>
        ))}
      </div>
    ),
    routing: (
      <div className="hero-glass-card space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Smart routing</p>
        {["Billing issue → Finance team", "Tech problem → Engineering", "Pre-sale → Sales team"].map((rule) => (
          <div key={rule} className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700">
            <Zap size={13} className="shrink-0 text-indigo-600" />
            {rule}
          </div>
        ))}
        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700"><strong>3 rules active</strong> — 98% routing accuracy</div>
      </div>
    ),
    leads: (
      <div className="hero-glass-card space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lead capture</p>
        <div className="rounded-xl bg-white/80 px-4 py-3 shadow-xs">
          <p className="text-sm font-semibold text-midnight">Visitor from: /pricing</p>
          <div className="mt-2 space-y-1 text-xs text-slate-500">
            <p>Time on site: 4m 12s</p>
            <p>Pages: 3 (features, pricing, demo)</p>
            <p>Lead score: <span className="font-semibold text-emerald-600">87/100</span></p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-white font-medium cursor-pointer">Start chat</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600 font-medium cursor-pointer">Send email</span>
        </div>
      </div>
    ),
  };
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-indigo-100/30 blur-3xl" />
      <div className="relative">{cards[type]}</div>
    </div>
  );
}

function FeatureBlock({ block }: { block: FeatureBlockData }) {
  const ref = useReveal();
  return (
    <section ref={ref as React.Ref<HTMLElement>} className={cx("reveal-on-scroll overflow-hidden", block.bg ?? "bg-white")}>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className={cx("lg:col-span-5", block.reverse && "lg:order-2 lg:col-start-8")}>
          <p className={OVERLINE}>{block.overline}</p>
          <h2 className={cx(DISPLAY_MD, "mt-4 max-w-xl")}>{block.headline}</h2>
          <ul className="mt-6 grid gap-2.5">
            {block.checks.map((item) => (
              <li key={item} className="flex items-start gap-3 text-base text-slate-600">
                <Check size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/signup" className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
            Start for free <ArrowRight size={16} />
          </Link>
        </div>
        <div className={cx("lg:col-span-7", block.reverse && "lg:order-1")}>
          <FeatureBlockVisual type={block.visual} />
        </div>
      </div>
    </section>
  );
}

/* ─── Stats bar ─── */
function StatsBar({ stats }: { stats: Array<{ value: string; label: string }> }) {
  const ref = useReveal();
  return (
    <section ref={ref as React.Ref<HTMLElement>} className="reveal-on-scroll border-y border-slate-200 bg-slate-50">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px px-0 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className={cx("flex flex-col items-center justify-center px-8 py-10 text-center", i > 0 && "border-l border-slate-200")}>
            <div className="font-display text-[2rem] font-bold leading-none tracking-[-0.02em] text-indigo-600">{s.value}</div>
            <p className="mt-2 text-sm font-normal text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Voice cards masonry (testimonials) ─── */
const voiceCards = [
  { company: "NOVA RETAIL",   stat: "43% faster responses", quote: "Flowlyra cut our first-response time in half. Customers notice.",                                                                      name: "Sarah Chen",        title: "VP Customer Experience" },
  { company: "GROWTHSTACK",   stat: "2.5x more sales",       quote: "We switched from our old helpdesk and the difference was immediate. Our team actually enjoys using this.",                            name: "Marcus Rodriguez",   title: "Head of Sales" },
  { company: "NORDIC SAAS",                                   quote: "The AI suggestions are subtle but brilliant. Agents accept them 80% of the time without editing, and the replies still sound like us.", name: "Emma Johansson",    title: "COO" },
  { company: "BRIGHTLINE",    stat: "98% satisfaction rate",  quote: "Setup took 15 minutes. Not days. Not weeks. Fifteen minutes.",                                                                         name: "Priya Nair",       title: "Support Operations Lead" },
  { company: "ATLAS WORKS",                                    quote: "Our CSAT went from 3.8 to 4.6 in the first quarter. The biggest change was giving agents context before they answered.",               name: "Daniel Park",      title: "Director of Support" },
  { company: "KINSHIP LABS",                                   quote: "Finally a support tool that doesn't feel like it was built in 2010.",                                                                  name: "Maya Thompson",    title: "Founder" },
  { company: "VECTRA CLOUD",  stat: "60% less ticket volume", quote: "The routing rules alone saved us two headcount worth of manual triage work. Calmer, faster, easier to manage.",                       name: "Owen Miller",       title: "Revenue Operations" },
  { company: "PULSE COMMERCE",                                 quote: "We process 3,000 chats a day across 4 teams. Flowlyra doesn't even blink.",                                                           name: "Leah Williams",    title: "Customer Care Manager" },
  { company: "MERCURY FINTECH",                                quote: "The handoff from bot to human feels seamless. Customers don't repeat themselves, and agents start with the full story.",               name: "Jon Bell",         title: "CX Systems Manager" },
];

function VoiceMasonry({ cards = voiceCards }: { cards?: typeof voiceCards }) {
  const ref = useReveal();
  return (
    <section ref={ref as React.Ref<HTMLElement>} className="reveal-on-scroll bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[600px] text-center">
          <p className={OVERLINE}>WHAT TEAMS SAY</p>
          <h2 className={cx(DISPLAY_LG, "mt-4")}>Real results from real teams</h2>
        </div>
        <div className="voice-masonry mt-12">
          {cards.map((card, i) => (
            <article key={`${card.company}-${card.name}`} className="voice-card reveal-child" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="flex h-6 items-center font-sans text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.company}</div>
              {card.stat && <div className="mt-5 font-display text-[2rem] font-bold leading-tight tracking-[-0.02em] text-indigo-600">{card.stat}</div>}
              <div className="mt-5 font-display text-5xl leading-none text-indigo-200" aria-hidden="true">&ldquo;</div>
              <p className="-mt-2 font-sans text-base italic leading-[1.6] text-slate-700">{card.quote}</p>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-midnight">{card.name}</p>
                <p className="mt-1 text-sm text-slate-500">{card.title}, {card.company}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────
   PAGE 1 — /features
   ─────────────────────────────────────────── */

const featureBlocks: FeatureBlockData[] = [
  {
    overline: "CONVERSATIONS",
    headline: "Talk to customers the moment they need you",
    checks: [
      "Instant messaging with typing indicators",
      "File & image sharing in-chat",
      "Smart routing to the right agent",
      "Proactive chat triggers by page or behavior",
    ],
    visual: "chat",
    bg: "bg-white",
  },
  {
    overline: "INTELLIGENCE",
    headline: "AI that helps your agents, not replaces them",
    checks: [
      "Real-time reply suggestions from context",
      "Auto-generated chat summaries",
      "Smart tag recommendations",
      "Sentiment detection and priority flags",
    ],
    visual: "ai",
    reverse: true,
    bg: "bg-slate-50",
  },
  {
    overline: "VISIBILITY",
    headline: "See your team at its best",
    checks: [
      "Real-time dashboard with live metrics",
      "CSAT tracking and trends",
      "Agent performance leaderboards",
      "Custom date range reports",
    ],
    visual: "analytics",
    bg: "bg-white",
  },
];

const featureGridItems: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: MessageCircle,    title: "Live chat",              desc: "Real-time conversations with typing previews and instant delivery." },
  { icon: Bot,              title: "AI copilot",             desc: "Context-aware reply suggestions that help agents respond faster." },
  { icon: BarChart3,        title: "Analytics dashboard",   desc: "Track volume, CSAT, response times, and resolution rates." },
  { icon: Inbox,            title: "Unified inbox",          desc: "All channels in one place — chat, email, social, and API." },
  { icon: MessageSquareText, title: "Canned responses",     desc: "Pre-written replies for common questions, searchable by shortcut." },
  { icon: Headphones,       title: "Ticket system",          desc: "Escalate conversations to support tickets with full context." },
  { icon: Zap,              title: "Proactive triggers",     desc: "Auto-start chats based on page, time on site, or cart value." },
  { icon: Tag,              title: "Chat tags & labels",     desc: "Categorise conversations for routing, reporting, and filtering." },
  { icon: Eye,              title: "Visitor tracking",       desc: "See where visitors are, what pages they've visited, and more." },
  { icon: Shield,           title: "Team management",        desc: "Roles, permissions, team routing groups, and audit logs." },
  { icon: Search,           title: "Chat history & search",  desc: "Full-text search across all past conversations, forever." },
  { icon: Globe,            title: "Multi-language support", desc: "Serve customers in their language with automatic detection." },
];

function FeatureFullGrid() {
  const ref = useReveal();
  return (
    <section ref={ref as React.Ref<HTMLElement>} className="reveal-on-scroll bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[640px] text-center">
          <p className={OVERLINE}>EVERYTHING YOU NEED</p>
          <h2 className={cx(DISPLAY_LG, "mt-4")}>Built for the rhythm of real conversations</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureGridItems.map((item, i) => (
            <article
              key={item.title}
              className={cx("feature-card reveal-child", i % 2 === 1 && "bg-indigo-50")}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <item.icon size={26} strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-[1.25rem] font-semibold leading-[1.3] text-midnight">{item.title}</h3>
              <p className="mt-3 text-sm leading-[1.5] text-slate-600">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeaturesPage() {
  return (
    <SubPageLayout
      headline="Everything your team needs"
      description="Powerful tools that work together to deliver conversations that convert."
    >
      {featureBlocks.map((block) => (
        <FeatureBlock key={block.overline} block={block} />
      ))}
      <FeatureFullGrid />
      <CTABanner />
    </SubPageLayout>
  );
}

/* ───────────────────────────────────────────
   PAGE 2 — /solutions/customer-support
   ─────────────────────────────────────────── */

const supportBlocks: FeatureBlockData[] = [
  {
    overline: "INBOX",
    headline: "One inbox for every channel",
    checks: [
      "Chat, email, social, and API in one place",
      "Assign conversations to teams or agents",
      "See visitor context before you reply",
      "Filters, tags, and search to find anything fast",
    ],
    visual: "inbox",
  },
  {
    overline: "ESCALATION",
    headline: "Nothing falls through the cracks",
    checks: [
      "Convert any chat to a support ticket",
      "SLA timers and priority flags",
      "Internal notes visible only to agents",
      "Resolution status tracking and history",
    ],
    visual: "routing",
    reverse: true,
    bg: "bg-slate-50",
  },
  {
    overline: "KNOWLEDGE",
    headline: "Answers at your agents' fingertips",
    checks: [
      "Canned responses for common questions",
      "AI-suggested replies from your knowledge base",
      "Full chat history for returning visitors",
      "Quick access to customer profile and orders",
    ],
    visual: "ai",
  },
];

const supportStats = [
  { value: "43%", label: "faster resolution time" },
  { value: "98%", label: "CSAT average" },
  { value: "60%", label: "fewer tickets" },
  { value: "2min", label: "avg first response" },
];

export function SolutionSupportPage() {
  return (
    <SubPageLayout
      headline="Customer support that customers actually love"
      description="Resolve faster. Satisfy more. Scale effortlessly."
    >
      {supportBlocks.map((block) => <FeatureBlock key={block.overline} block={block} />)}
      <StatsBar stats={supportStats} />
      <VoiceMasonry cards={voiceCards.filter((_, i) => [0, 3, 4, 6, 7].includes(i))} />
      <CTABanner />
    </SubPageLayout>
  );
}

/* ───────────────────────────────────────────
   PAGE 3 — /solutions/sales-marketing
   ─────────────────────────────────────────── */

const salesBlocks: FeatureBlockData[] = [
  {
    overline: "ENGAGEMENT",
    headline: "Reach visitors before they leave",
    checks: [
      "Trigger chats based on time on site, scroll depth, or exit intent",
      "Personalise greetings by URL, referral source, or campaign",
      "Run A/B tests on proactive messages",
      "Pause and schedule triggers by business hours",
    ],
    visual: "leads",
  },
  {
    overline: "QUALIFICATION",
    headline: "Capture high-intent leads in the conversation",
    checks: [
      "Pre-chat forms that enrich your CRM automatically",
      "Assign lead scores based on behaviour",
      "Route hot leads directly to your top closers",
      "Sync to HubSpot, Salesforce, or any CRM via API",
    ],
    visual: "routing",
    reverse: true,
    bg: "bg-slate-50",
  },
  {
    overline: "REVENUE",
    headline: "Track what chat-driven conversations convert",
    checks: [
      "See which chats result in purchases",
      "Attribution across sessions and channels",
      "Goal tracking tied to individual agent activity",
      "Revenue reporting inside your analytics dashboard",
    ],
    visual: "analytics",
  },
];

const salesStats = [
  { value: "2.5x", label: "more conversions" },
  { value: "+$47", label: "avg order increase" },
  { value: "35%", label: "more qualified leads" },
  { value: "10x", label: "ROI on chat" },
];

export function SolutionSalesPage() {
  return (
    <SubPageLayout
      headline="Turn browsers into buyers"
      description="Engage visitors at the right moment with the right message."
    >
      {salesBlocks.map((block) => <FeatureBlock key={block.overline} block={block} />)}
      <StatsBar stats={salesStats} />
      <VoiceMasonry cards={voiceCards.filter((_, i) => [1, 2, 5, 6, 8].includes(i))} />
      <CTABanner />
    </SubPageLayout>
  );
}

/* ───────────────────────────────────────────
   PAGE 4 — /integrations
   ─────────────────────────────────────────── */

type IntegrationCategory = "All" | "Messaging" | "Ecommerce" | "CRM" | "Automation" | "Payments" | "Analytics";

const integrations: Array<{ name: string; category: IntegrationCategory; color: string }> = [
  { name: "Slack",             category: "Messaging",  color: "#4A154B" },
  { name: "WhatsApp",          category: "Messaging",  color: "#25D366" },
  { name: "Instagram",         category: "Messaging",  color: "#E1306C" },
  { name: "Messenger",         category: "Messaging",  color: "#0084FF" },
  { name: "Shopify",           category: "Ecommerce",  color: "#96BF48" },
  { name: "BigCommerce",       category: "Ecommerce",  color: "#34313F" },
  { name: "WordPress",         category: "Ecommerce",  color: "#21759B" },
  { name: "Salesforce",        category: "CRM",        color: "#00A1E0" },
  { name: "HubSpot",           category: "CRM",        color: "#FF7A59" },
  { name: "Pipedrive",         category: "CRM",        color: "#26292C" },
  { name: "Zapier",            category: "Automation", color: "#FF4A00" },
  { name: "Mailchimp",         category: "Automation", color: "#FFE01B" },
  { name: "Stripe",            category: "Payments",   color: "#6772E5" },
  { name: "Twilio",            category: "Payments",   color: "#F22F46" },
  { name: "Google Analytics",  category: "Analytics",  color: "#E37400" },
  { name: "Calendly",          category: "Automation", color: "#006BFF" },
];

const INT_CATEGORIES: IntegrationCategory[] = ["All", "Messaging", "Ecommerce", "CRM", "Automation", "Payments", "Analytics"];

function IntegrationCard({ name, category, color }: { name: string; category: string; color: string }) {
  return (
    <div className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold text-white"
        style={{ background: color }}
        aria-hidden="true"
      >
        {name[0]}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-midnight">{name}</p>
        <p className="mt-0.5 text-xs text-slate-500">{category}</p>
      </div>
    </div>
  );
}

export function IntegrationsPage() {
  const [active, setActive] = useState<IntegrationCategory>("All");
  const ref = useReveal();
  const filtered = active === "All" ? integrations : integrations.filter((i) => i.category === active);

  return (
    <SubPageLayout
      headline="Connects with your entire stack"
      description="200+ integrations to keep your workflow seamless."
    >
      <section ref={ref as React.Ref<HTMLElement>} className="reveal-on-scroll mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        {/* Section heading */}
        <div className="mb-10 text-center">
          <p className={OVERLINE}>INTEGRATIONS</p>
          <h2 className={cx(DISPLAY_LG, "mt-4")}>One platform, every channel</h2>
        </div>

        {/* Filter pills */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {INT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                active === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((int) => (
            <IntegrationCard key={int.name} {...int} />
          ))}
        </div>
      </section>

      <CTABanner />
    </SubPageLayout>
  );
}

/* ───────────────────────────────────────────
   PAGE 5 — /customers
   ─────────────────────────────────────────── */

const logoNames = [
  "Nova Retail", "GrowthStack", "Nordic SaaS", "BrightLine",
  "Atlas Works", "Kinship Labs", "Vectra Cloud", "Pulse Commerce",
  "Mercury Fintech", "Orion Health", "Summit Commerce", "Apex Digital",
];

const caseStudies = [
  { company: "Nova Retail",     headline: "How Nova Retail reduced response time by 43%",         preview: "Nova Retail's support team was overwhelmed during peak season. After deploying Flowlyra's smart routing and AI suggestions, they cut response time nearly in half." },
  { company: "Vectra Cloud",    headline: "How Vectra Cloud eliminated 60% of support tickets",    preview: "By using proactive triggers and context-aware chat, Vectra Cloud deflected the majority of routine inquiries before they ever reached an agent." },
  { company: "GrowthStack",     headline: "How GrowthStack doubled qualified leads from chat",     preview: "GrowthStack used Flowlyra's lead scoring and instant routing to identify high-intent visitors and connect them with sales within seconds." },
];

function CaseStudyCard({ company, headline, preview }: { company: string; headline: string; preview: string }) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-md transition-shadow hover:shadow-lg">
      {/* Company logo placeholder */}
      <div className="flex h-10 items-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-600">
          {company[0]}
        </span>
        <span className="ml-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{company}</span>
      </div>
      <h3 className="mt-5 font-display text-[1.2rem] font-semibold leading-[1.3] text-midnight">{headline}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-[1.6] text-slate-600">{preview}</p>
      <Link
        to="/contact"
        className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
      >
        Read case study <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function CustomersPage() {
  const logoRef = useReveal();
  const caseRef = useReveal();

  return (
    <SubPageLayout
      headline="Teams that flow with us"
      description="See how companies use Flowlyra to transform their conversations."
    >
      {/* Logo bar */}
      <section ref={logoRef as React.Ref<HTMLElement>} className="reveal-on-scroll border-b border-slate-200 bg-white py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <p className={cx(OVERLINE, "mb-8 text-center")}>TRUSTED BY TEAMS WORLDWIDE</p>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {logoNames.map((name, i) => (
              <div
                key={name}
                className="reveal-child flex h-12 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-400 grayscale transition-all hover:grayscale-0 hover:text-midnight hover:shadow-xs"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice cards masonry */}
      <VoiceMasonry />

      {/* Case studies */}
      <section ref={caseRef as React.Ref<HTMLElement>} className="reveal-on-scroll mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mb-10 text-center">
          <p className={OVERLINE}>CASE STUDIES</p>
          <h2 className={cx(DISPLAY_LG, "mt-4")}>Real stories, measurable results</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {caseStudies.map((cs) => <CaseStudyCard key={cs.company} {...cs} />)}
        </div>
      </section>

      <CTABanner />
    </SubPageLayout>
  );
}
