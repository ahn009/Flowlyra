import {
  ArrowRight, BarChart3, Bot, CheckCircle2, ChevronDown, ChevronRight, CreditCard, Globe2,
  Headphones, Layers3, LifeBuoy, LineChart, Lock, Mail, MessageCircle, MessageSquareText,
  Network, Paperclip, Play, ShieldCheck, Sparkles, Star, TrendingUp, Truck, Users, Workflow,
  Zap, Send, type LucideIcon,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Pill, cx } from "../components/ui";
import flowlyraLogo from "../assets/flowlyra-logo.svg";
import flowlyraMark from "../assets/flowlyra-mark.svg";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { MarketingNavigation } from "../components/MarketingNavigation";

/* ================================================================
   DATA
   ================================================================ */

const topNav = [
  { to: "/features", label: "Product" },
  { to: "/solutions/customer-support", label: "Solutions" },
  { to: "/pricing", label: "Pricing" },
  { to: "/customers", label: "Customers" },
  { to: "/integrations", label: "Resources" },
];

const solutionLinks = [
  { to: "/solutions/customer-support", label: "Customer Support" },
  { to: "/solutions/sales-marketing", label: "Sales & Marketing" },
  { to: "/solutions/enterprise", label: "Enterprise" },
];

const coreFeatures = [
  { icon: MessageSquareText, title: "Chat tools", items: ["Canned responses", "File sharing", "Chat tags", "Chat transfers"] },
  { icon: Workflow, title: "Engagement automation", items: ["Targeted greetings", "Routing rules", "Availability schedules", "Chat assignment"] },
  { icon: Globe2, title: "Messaging channels", items: ["Website widget", "Email handoff", "Social channels", "Mobile-ready experience"] },
  { icon: LineChart, title: "Reporting", items: ["Agent performance", "Chat satisfaction", "Response-time trends", "Conversion tracking"] },
  { icon: ShieldCheck, title: "Security", items: ["Access controls", "Audit-friendly logs", "Secure data handling", "Role-based permissions"] },
  { icon: Sparkles, title: "AI copilots", items: ["Reply assistance", "Conversation summaries", "Tag suggestions", "Tone improvements"] },
];

const integrationsList = [
  "Shopify", "WordPress", "HubSpot", "Salesforce", "Slack", "Zapier",
  "Mailchimp", "Google Analytics", "BigCommerce", "Meta", "WhatsApp", "Stripe",
  "Intercom", "Zendesk", "Jira", "Notion", "Pipedrive", "Freshdesk",
];

const heroPhrases = ["Increase online sales", "Improve customer satisfaction", "Automate customer service"];

const marqueeNames = [
  "Acme Corp", "Globex Inc", "Initech", "Umbrella Co", "Stark Industries",
  "Wayne Ent.", "Cyberdyne", "Aperture", "Oscorp", "Massive Dynamic",
];

const salesFeatures = [
  { icon: MessageSquareText, label: "Pre-set messages" },
  { icon: CreditCard, label: "Product cards" },
  { icon: TrendingUp, label: "Proactive engagement" },
  { icon: Zap, label: "Quick replies" },
];

const satisfactionFeatures = [
  { icon: MessageSquareText, label: "Unified inbox" },
  { icon: Users, label: "Customer data panel" },
  { icon: Zap, label: "Fast response times" },
];

const aiFeatures = [
  { icon: Sparkles, label: "AI Copilot" },
  { icon: Bot, label: "Chatbot builder" },
  { icon: Network, label: "Smart routing" },
  { icon: Mail, label: "Text enhancement" },
];

const testimonials = [
  { name: "Sarah Chen", company: "TechRetail Co", role: "VP of Customer Success", quote: "FlowLyra reduced our first response time by 62% and our CSAT scores jumped 18 points in the first quarter.", rating: 5 },
  { name: "Marcus Rodriguez", company: "GrowthStack", role: "Head of Sales", quote: "We saw a 3.2x increase in qualified leads after deploying FlowLyra's proactive chat on our product pages.", rating: 5 },
  { name: "Emma Johansson", company: "Nordic SaaS AB", role: "COO", quote: "The AI Copilot handles 40% of routine inquiries automatically. Our agents focus on high-value conversations now.", rating: 5 },
];

const homepagePlans = [
  { name: "Starter", price: "$19", period: "/mo", audience: "Small teams", points: ["1 agent seat", "Basic live chat", "Email support", "14-day history", "1 website"], cta: "Get started", highlighted: false },
  { name: "Team", price: "$39", period: "/agent/mo", audience: "Growing teams", points: ["Unlimited agents", "AI suggestions", "Integrations", "Reports & analytics", "3 websites", "1-year history", "Chatbot"], cta: "Start free trial", highlighted: true },
  { name: "Business", price: "$59", period: "/agent/mo", audience: "Established teams", points: ["Everything in Team", "Automation workflows", "Advanced chatbot", "AI Copilot", "5 websites", "Unlimited history", "SLA policies"], cta: "Start free trial", highlighted: false },
];

/* ================================================================
   INTERFACES
   ================================================================ */

interface PublicIncident {
  id: string; title: string; body: string; status: string; impact: string; components: string[];
  started_at?: string | null; resolved_at?: string | null;
}

interface PublicBlogPost {
  id: string; slug: string; title: string; excerpt: string; content_markdown: string;
  cover_image_url?: string | null; tags: string[]; published_at?: string | null;
}

/* ================================================================
   SHARED HELPERS (used by all pages including Home/Pricing)
   ================================================================ */

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
      <span className="font-semibold text-navy-500">{label}</span>
      <span className="font-bold text-navy-700">{value}</span>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ to: string; label: string }> }): JSX.Element {
  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-wide text-navy-400">{title}</h2>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="text-sm font-medium text-navy-400 hover:text-white transition-colors">{link.label}</Link>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   SITE FOOTER (shared by Home & Pricing standalone pages)
   ================================================================ */

function SiteFooter(): JSX.Element {
  return (
    <footer className="bg-navy-900 text-navy-300" role="contentinfo">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-6">
        <div className="lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src={flowlyraMark} alt="" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-lg font-extrabold text-white">FlowLyra</span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-navy-400">Conversations that move.</p>
          {/* Social icons */}
          <div className="mt-5 flex gap-3">
            {["X", "Li", "Gh", "Yt"].map((s) => (
              <span key={s} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-navy-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">{s}</span>
            ))}
          </div>
        </div>
        <FooterColumn title="Product" links={[{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/integrations", label: "Integrations" }, { to: "/product-tour", label: "Product Tour" }, { to: "/help", label: "Help Center" }]} />
        <FooterColumn title="Solutions" links={solutionLinks} />
        <FooterColumn title="Resources" links={[{ to: "/customers", label: "Customers" }, { to: "/blog", label: "Blog" }, { to: "/help", label: "Documentation" }, { to: "/help", label: "API Reference" }]} />
        <FooterColumn title="Company" links={[{ to: "/contact", label: "Contact" }, { to: "/customers", label: "About" }, { to: "/status", label: "Status" }, { to: "/blog", label: "Careers" }]} />
        <FooterColumn title="Legal" links={[{ to: "/privacy", label: "Privacy" }, { to: "/terms", label: "Terms" }, { to: "/privacy", label: "Security" }, { to: "/terms", label: "Cookies" }]} />
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <p className="text-xs text-navy-400">&copy; {new Date().getFullYear()} FlowLyra. All rights reserved.</p>
          <p className="text-xs text-navy-400">Built with care for customer-obsessed teams.</p>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   HOME PAGE
   ================================================================ */

const trustLogos = ["Company A", "Company B", "Company C", "Company D", "Company E", "Company F"];

function HeroGlassCard({
  className,
  delay,
  title,
  visitor,
  agent,
}: {
  className: string;
  delay: string;
  title: string;
  visitor: string;
  agent: string;
}): JSX.Element {
  return (
    <div className={cx("hero-glass-card animate-hero-card", className)} style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm font-semibold text-midnight">Live conversation</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Flowing
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700 shadow-xs">
          {visitor}
        </div>
        <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-indigo-600/20">
          {agent}
        </div>
      </div>
    </div>
  );
}

function HeroChatMockup(): JSX.Element {
  return (
    <div className="relative mx-auto hidden min-h-[520px] w-full max-w-xl md:block lg:col-span-5">
      <div className="absolute left-8 top-8 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute bottom-14 right-8 h-56 w-56 rounded-full bg-coral-300/20 blur-3xl" />
      <HeroGlassCard
        className="absolute left-0 top-12 w-[82%] [rotate:-4deg] animate-float-gentle"
        delay="0ms"
        title="Support"
        visitor="Can you help me choose the right plan for my team?"
        agent="Absolutely. Tell me your team size and I’ll guide you to the best fit."
      />
      <HeroGlassCard
        className="absolute right-0 top-40 z-10 w-[78%] [rotate:3deg] animate-float-gentle-slow"
        delay="100ms"
        title="Sales"
        visitor="Do you integrate with our CRM and ecommerce stack?"
        agent="Yes. Flowlyra connects chats, customer history, and revenue signals in one flow."
      />
      <HeroGlassCard
        className="absolute bottom-4 left-12 w-[70%] [rotate:-2deg] animate-float-gentle"
        delay="200ms"
        title="AI Copilot"
        visitor="Summarize this chat for handoff?"
        agent="Done. Priority lead, interested in annual plan, wants Salesforce routing."
      />
    </div>
  );
}

function MobileHeroGlassCard(): JSX.Element {
  return (
    <div className="hero-glass-card animate-hero-card md:hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-midnight">Live conversation</p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">Flowing</span>
      </div>
      <div className="mt-5 grid gap-3">
        <div className="max-w-[86%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm text-slate-700">Can you help my team move faster?</div>
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-sm text-white">Yes. Flowlyra brings support, sales, and AI into one smooth conversation.</div>
      </div>
    </div>
  );
}

function SocialProofBar(): JSX.Element {
  return (
    <section className="bg-white" aria-labelledby="trust-bar-title">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <p id="trust-bar-title" className="text-center font-sans text-[11px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-slate-500">
          Trusted by 10,000+ support teams
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {trustLogos.map((name, index) => (
            <div
              key={name}
              className="animate-trust-logo flex h-8 items-center justify-center grayscale transition-opacity duration-200 hover:opacity-100"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="font-display text-xl font-semibold tracking-[-0.03em] text-slate-500 opacity-50">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const asymmetricFeatures = [
  {
    overline: "REAL-TIME CHAT",
    title: "Real-time conversations",
    description: "Meet customers in the moment with fast, fluid messaging that keeps context close. Every reply, handoff, and note stays connected so teams can move naturally.",
    link: "/features",
    bg: "bg-white",
    reverse: false,
    visual: "chat" as const,
  },
  {
    overline: "AI AGENT ASSIST",
    title: "AI-powered agent assist",
    description: "Give every agent a copilot that drafts thoughtful replies, summarizes long threads, and suggests next actions without taking the human out of the conversation.",
    link: "/features/ai",
    bg: "bg-slate-50",
    reverse: true,
    visual: "ai" as const,
  },
  {
    overline: "GROWTH INSIGHTS",
    title: "Insights that drive growth",
    description: "See which conversations convert, where customers get stuck, and how your team performs across every channel, all in a calm reporting workspace.",
    link: "/features/analytics",
    bg: "bg-white",
    reverse: false,
    visual: "analytics" as const,
  },
];

const featureCards = [
  { icon: Layers3, title: "Omnichannel inbox", description: "Bring website, email, and social conversations into one focused team workspace." },
  { icon: Zap, title: "Smart routing", description: "Send every conversation to the right team based on intent, priority, and context." },
  { icon: MessageCircle, title: "Canned responses", description: "Reply faster with polished snippets that agents can personalize in seconds." },
  { icon: CheckCircle2, title: "Ticketing system", description: "Turn complex conversations into trackable work without losing chat history." },
  { icon: Users, title: "Contact management", description: "Keep profiles, notes, and conversation timelines ready for every teammate." },
  { icon: Paperclip, title: "File sharing", description: "Exchange screenshots, documents, and details safely inside the conversation." },
];

const featureTabs = [
  {
    label: "Sales",
    title: "Turn high-intent chats into qualified pipeline",
    description: "Spot buying signals, route prospects instantly, and keep the next best action visible from first message to booked meeting.",
    cta: "/solutions/sales-marketing",
    stat: "3.2x",
    caption: "more qualified leads",
  },
  {
    label: "Support",
    title: "Resolve customer questions with calm precision",
    description: "Give agents the full conversation history, customer profile, and reply tools they need to deliver confident support.",
    cta: "/solutions/customer-support",
    stat: "62%",
    caption: "faster first replies",
  },
  {
    label: "Automation",
    title: "Let smart workflows handle the repeat work",
    description: "Automate routing, tagging, follow-ups, and handoffs while your team focuses on the conversations that need a human touch.",
    cta: "/features/automation",
    stat: "24/7",
    caption: "coverage without clutter",
  },
  {
    label: "Analytics",
    title: "Learn what moves customers forward",
    description: "Measure response speed, conversion paths, satisfaction, and team load in reporting views designed for action.",
    cta: "/features/analytics",
    stat: "18pt",
    caption: "CSAT lift visibility",
  },
];

function ProductVisual({ type }: { type: "chat" | "ai" | "analytics" }): JSX.Element {
  if (type === "analytics") {
    return (
      <div className="feature-visual-stage">
        <div className="feature-ui-card feature-tilt-left absolute left-3 top-8 w-[72%] p-6">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold text-midnight">Growth dashboard</p><BarChart3 className="text-indigo-600" size={22} /></div>
          <div className="mt-6 flex items-end gap-3">
            {[44, 72, 58, 88, 68, 96].map((h, i) => <div key={i} className="w-full rounded-t-lg bg-indigo-600/80" style={{ height: `${h}px` }} />)}
          </div>
        </div>
        <div className="feature-ui-card feature-tilt-right absolute bottom-10 right-0 z-10 w-[58%] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-indigo-600">Conversion flow</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Chats opened</span><strong className="text-midnight">4,820</strong></div>
            <div className="flex justify-between"><span>Qualified</span><strong className="text-midnight">1,284</strong></div>
            <div className="flex justify-between"><span>Meetings</span><strong className="text-indigo-600">318</strong></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "ai") {
    return (
      <div className="feature-visual-stage">
        <div className="feature-ui-card feature-tilt-right absolute right-6 top-6 w-[78%] p-6">
          <p className="text-sm font-semibold text-midnight">AI suggestion</p>
          <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm leading-6 text-slate-700">“I can help with that. Based on your workspace, the Team plan includes routing, tags, and AI summaries.”</div>
          <div className="mt-4 flex gap-2"><span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">Use reply</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Refine tone</span></div>
        </div>
        <div className="feature-ui-card feature-tilt-left absolute bottom-8 left-0 z-10 w-[62%] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-indigo-600">Thread summary</p>
          <div className="mt-3 space-y-2"><div className="h-2 rounded bg-slate-200" /><div className="h-2 w-5/6 rounded bg-slate-200" /><div className="h-2 w-2/3 rounded bg-slate-200" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-visual-stage">
      <div className="feature-ui-card feature-tilt-left absolute left-2 top-5 w-[76%] p-6">
        <p className="text-sm font-semibold text-midnight">Conversation stream</p>
        <div className="mt-5 grid gap-3">
          <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm text-slate-700">I need help with our workspace setup.</div>
          <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-sm text-white">I’m here. Let’s get your team flowing today.</div>
        </div>
      </div>
      <div className="feature-ui-card feature-tilt-right absolute bottom-8 right-2 z-10 w-[58%] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-indigo-600">Agent context</p>
        <div className="mt-4 grid gap-2"><div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">Priority: High</div><div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">Intent: onboarding</div></div>
      </div>
    </div>
  );
}

function AsymmetricFeatureBlock({ feature, index }: { feature: (typeof asymmetricFeatures)[number]; index: number }): JSX.Element {
  return (
    <section className={cx("reveal-on-scroll overflow-hidden", feature.bg)}>
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:py-24">
        <div className={cx("lg:col-span-5", feature.reverse && "lg:order-2 lg:col-start-8")}>
          <p className="font-sans text-[11px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-indigo-600">{feature.overline}</p>
          <h2 className="mt-4 font-display text-[1.75rem] font-bold leading-[1.2] tracking-[-0.01em] text-midnight">{feature.title}</h2>
          <p className="mt-4 max-w-xl font-sans text-base font-normal leading-[1.6] text-slate-600">{feature.description}</p>
          <Link to={feature.link} className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-indigo-600 hover:underline">
            Learn more <ArrowRight size={16} />
          </Link>
        </div>
        <div className={cx("lg:col-span-7", feature.reverse && "lg:order-1 lg:col-span-7")}>
          <ProductVisual type={feature.visual} />
        </div>
      </div>
    </section>
  );
}

function FeatureGridSection(): JSX.Element {
  return (
    <section className="reveal-on-scroll bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="font-sans text-[11px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-indigo-600">EVERYTHING YOU NEED</p>
          <h2 className="mt-4 font-display text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-midnight">Built for the rhythm of real conversations</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature, index) => (
            <article key={feature.title} className={cx("reveal-child feature-card", index % 2 === 1 && "bg-indigo-50")} style={{ transitionDelay: `${index * 80}ms` }}>
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><feature.icon size={48} strokeWidth={1.75} /></div>
              <h3 className="mt-6 font-display text-[1.375rem] font-semibold leading-[1.3] text-midnight">{feature.title}</h3>
              <p className="mt-3 line-clamp-2 text-sm leading-[1.5] text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureTabsSection(): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);
  const active = featureTabs[activeTab];

  return (
    <section className="reveal-on-scroll bg-[var(--gradient-surface)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 border-b border-slate-200">
          {featureTabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(index)}
              className={cx("relative pb-4 text-[15px] font-semibold transition-colors duration-300", activeTab === index ? "text-indigo-600" : "text-slate-500 hover:text-slate-700")}
            >
              {tab.label}
              <span className={cx("absolute bottom-[-1px] left-0 h-[3px] w-full rounded-full bg-indigo-600 transition-transform duration-300", activeTab === index ? "scale-x-100" : "scale-x-0")} />
            </button>
          ))}
        </div>
        <div key={active.label} className="feature-tab-panel mt-12 grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em] text-midnight">{active.title}</h2>
            <p className="mt-4 text-base leading-[1.6] text-slate-600">{active.description}</p>
            <Link to={active.cta} className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-indigo-600 hover:underline">Explore {active.label.toLowerCase()} <ArrowRight size={16} /></Link>
          </div>
          <div className="lg:col-span-7">
            <div className="feature-tab-card">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold text-midnight">{active.label} workspace</p><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">Live view</span></div>
              <div className="mt-8 grid gap-6 sm:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl bg-indigo-600 p-5 text-white"><div className="font-display text-4xl font-bold">{active.stat}</div><p className="mt-2 text-sm text-white/80">{active.caption}</p></div>
                <div className="grid gap-3">{["Conversation captured", "Team routed", "Next step created"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600"><CheckCircle2 className="text-indigo-600" size={18} />{item}</div>)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFeatureSections(): JSX.Element {
  return (
    <>
      {asymmetricFeatures.map((feature, index) => <AsymmetricFeatureBlock key={feature.title} feature={feature} index={index} />)}
      <FeatureGridSection />
      <FeatureTabsSection />
    </>
  );
}

function IntegrationsSection(): JSX.Element {
  return (
    <section className="border-y border-navy-100/60 bg-white dark:border-navy-800/60 dark:bg-navy-900/20">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="text-center">
          <Pill tone="brand" className="rounded-full">Integrations</Pill>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-navy-700 sm:text-4xl dark:text-white">200+ integrations</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-navy-500 dark:text-navy-400">Connect FlowLyra to the tools your team already uses.</p>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {integrationsList.map((name) => (
            <div key={name} className="flex items-center justify-center rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm font-semibold text-navy-500 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 hover:shadow-xs dark:border-navy-800 dark:bg-navy-800/40 dark:text-navy-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 dark:hover:text-brand-400 cursor-default">
              {name}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/integrations" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors">
            View all integrations <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const voiceCards = [
  { company: "NOVA RETAIL", stat: "43% faster responses", quote: "Flowlyra cut our first-response time in half. Customers notice.", name: "Sarah Chen", title: "VP Customer Experience" },
  { company: "GROWTHSTACK", stat: "2.5x more sales", quote: "We switched from our old helpdesk and the difference was immediate. Our team actually enjoys using this.", name: "Marcus Rodriguez", title: "Head of Sales" },
  { company: "NORDIC SAAS", quote: "The AI suggestions are subtle but brilliant. Agents accept them 80% of the time without editing, and the replies still sound like us.", name: "Emma Johansson", title: "COO" },
  { company: "BRIGHTLINE", stat: "98% satisfaction rate", quote: "Setup took 15 minutes. Not days. Not weeks. Fifteen minutes.", name: "Priya Nair", title: "Support Operations Lead" },
  { company: "ATLAS WORKS", quote: "Our CSAT went from 3.8 to 4.6 in the first quarter. The biggest change was giving agents context before they answered.", name: "Daniel Park", title: "Director of Support" },
  { company: "KINSHIP LABS", quote: "Finally a support tool that doesn't feel like it was built in 2010.", name: "Maya Thompson", title: "Founder" },
  { company: "VECTRA CLOUD", stat: "60% less ticket volume", quote: "The routing rules alone saved us two headcount worth of manual triage work. It is calmer, faster, and easier to manage.", name: "Owen Miller", title: "Revenue Operations" },
  { company: "PULSE COMMERCE", quote: "We process 3,000 chats a day across 4 teams. Flowlyra doesn't even blink.", name: "Leah Williams", title: "Customer Care Manager" },
  { company: "MERCURY FINTECH", quote: "The handoff from bot to human feels seamless. Customers don't have to repeat themselves, and agents start with the full story.", name: "Jon Bell", title: "CX Systems Manager" },
];

const homeStats = [
  { value: 10000, suffix: "+", label: "support teams worldwide" },
  { value: 4.8, suffix: "/5", label: "average customer satisfaction", decimals: 1 },
  { value: 30, prefix: "<", suffix: "s", label: "average first response time" },
  { value: 99.9, suffix: "%", label: "platform uptime", decimals: 1 },
];

function CountUpStat({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / 800, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayValue(value * eased);
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.45 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString();
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

function VoiceCard({ card, index }: { card: (typeof voiceCards)[number]; index: number }): JSX.Element {
  return (
    <article className="voice-card reveal-child" style={{ transitionDelay: `${index * 80}ms` }}>
      <div className="flex h-6 items-center font-sans text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.company}</div>
      {card.stat && <div className="mt-5 font-display text-[2rem] font-bold leading-tight tracking-[-0.02em] text-indigo-600">{card.stat}</div>}
      <div className="mt-5 font-display text-5xl leading-none text-indigo-200" aria-hidden="true">&ldquo;</div>
      <p className="-mt-2 font-sans text-base font-normal italic leading-[1.6] text-slate-700">{card.quote}</p>
      <div className="mt-6 border-t border-slate-200 pt-4">
        <p className="text-sm font-semibold text-midnight">{card.name}</p>
        <p className="mt-1 text-sm font-normal text-slate-500">{card.title}, {card.company}</p>
      </div>
    </article>
  );
}

function TestimonialsSection(): JSX.Element {
  return (
    <section className="reveal-on-scroll bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="font-sans text-[11px] font-bold uppercase leading-[1.2] tracking-[0.1em] text-indigo-600">WHAT TEAMS SAY</p>
          <h2 className="mt-4 font-display text-[clamp(1.75rem,3.5vw+0.75rem,3rem)] font-bold leading-[1.1] tracking-[-0.025em] text-midnight">Real results from real teams</h2>
        </div>

        <div className="voice-masonry mt-12">
          {voiceCards.map((card, index) => <VoiceCard key={`${card.company}-${card.name}`} card={card} index={index} />)}
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {homeStats.map((stat, index) => (
            <div key={stat.label} className="reveal-child stat-card" style={{ transitionDelay: `${index * 80}ms` }}>
              <div className="font-display text-[clamp(1.5rem,2.5vw+0.5rem,2.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-indigo-600">
                <CountUpStat value={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
              </div>
              <p className="mt-2 text-sm font-normal leading-[1.5] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="text-center">
        <Pill tone="brand" className="rounded-full">Pricing</Pill>
        <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-navy-700 sm:text-4xl dark:text-white">Simple, transparent pricing</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-navy-500 dark:text-navy-400">Start free. No credit card required.</p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {homepagePlans.map((plan) => (
          <Card
            key={plan.name}
            className={cx(
              "relative p-6 transition-shadow dark:bg-navy-800/60 dark:border-navy-700/50",
              plan.highlighted && "ring-2 ring-brand-400 shadow-glow dark:ring-brand-500"
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-glow">Most popular</span>
            )}
            <h3 className="font-display text-lg font-bold text-navy-700 dark:text-white">{plan.name}</h3>
            <p className="text-sm text-navy-400">{plan.audience}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold text-navy-700 dark:text-white">{plan.price}</span>
              <span className="text-sm font-medium text-navy-400">{plan.period}</span>
            </div>
            <div className="mt-5 grid gap-2.5 text-sm text-navy-500 dark:text-navy-400">
              {plan.points.map((pt) => (
                <div key={pt} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-brand-500" />{pt}</div>
              ))}
            </div>
            <Link
              to="/signup"
              className={cx(
                "mt-6 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition-all",
                plan.highlighted
                  ? "bg-brand-500 text-white shadow-glow hover:bg-brand-600 hover:shadow-glow-lg"
                  : "border border-navy-100 bg-white text-navy-700 hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:border-brand-800"
              )}
            >
              {plan.cta}
            </Link>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors">
          See all plans <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function CTASection(): JSX.Element {
  const [email, setEmail] = useState("");
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to transform your customer conversations?
          </h2>
          <p className="mt-4 text-base leading-7 text-brand-100">
            Join 35,000+ companies using FlowLyra to deliver exceptional customer experiences.
          </p>
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            onSubmit={(e) => { e.preventDefault(); toast.success("Welcome! Check your email."); setEmail(""); }}
          >
            <input
              type="email"
              required
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/60 backdrop-blur-sm outline-none transition-all focus:border-white/40 focus:ring-4 focus:ring-white/10 sm:max-w-sm"
              aria-label="Work email"
            />
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-brand-600 shadow-lg transition-all hover:bg-brand-50 hover:shadow-xl sm:w-auto"
            >
              Start free trial <ArrowRight size={16} />
            </button>
          </form>
          <p className="mt-4 text-xs text-brand-200">No credit card required. 14-day free trial on all plans.</p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   EXPORTED: HomePage
   ================================================================ */

export function HomePage(): JSX.Element {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-navy-700 dark:bg-navy-950 dark:text-navy-100">
      <MarketingNavigation />

      <main>
        {/* Hero */}
        <section className="hero-gradient-bg constellation relative overflow-hidden text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.22),transparent_26rem),radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.14),transparent_24rem),radial-gradient(circle_at_52%_88%,rgba(249,112,102,0.18),transparent_30rem)]" />
          <div className="relative mx-auto grid min-h-0 w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 md:min-h-[90vh] lg:grid-cols-12 lg:gap-10 lg:py-20">
            <div className="lg:col-span-7">
              <h1 className="animate-hero-title max-w-3xl font-display text-[clamp(2.25rem,5vw+1rem,4rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Support that flows. Sales that grow.
              </h1>
              <p className="animate-hero-subtitle mt-6 max-w-2xl font-sans text-[1.125rem] font-normal leading-[1.7] text-white/85">
                The human-first platform where every chat turns into value.
              </p>
              <div className="animate-hero-ctas mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-lg shadow-indigo-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-indigo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
                >
                  Start flowing free
                </Link>
                <Link
                  to="/product-tour"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15 hover:border-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
                >
                  <Play size={18} /> Watch demo
                </Link>
              </div>
              <p className="animate-hero-ctas mt-4 text-xs font-medium leading-[1.4] text-white/60">
                No credit card required · 14-day free trial
              </p>
              <div className="mt-10">
                <MobileHeroGlassCard />
              </div>
            </div>
            <HeroChatMockup />
          </div>
        </section>

        {/* Social proof marquee */}
        <SocialProofBar />

        <HomeFeatureSections />

        {/* Integrations */}
        <IntegrationsSection />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Pricing preview */}
        <PricingPreviewSection />

        {/* Final CTA */}
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ================================================================
   EXPORTED: PricingPage (full standalone page)
   ================================================================ */

const pricingFaqs = [
  { q: "Can I try FlowLyra for free?", a: "Yes! Every plan comes with a 14-day free trial. No credit card required to get started." },
  { q: "What happens when I exceed my plan limits?", a: "We'll notify you before any overages occur. You can upgrade at any time, and changes take effect immediately." },
  { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade at any time. Changes are prorated automatically." },
  { q: "Do you offer discounts for annual billing?", a: "Yes, annual billing saves you 20% compared to monthly billing on all paid plans." },
  { q: "Is my data secure?", a: "All data is encrypted in transit and at rest. We're SOC 2 compliant and follow industry-standard security practices." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards, ACH bank transfers, and can accommodate purchase orders for Enterprise plans." },
];

function AccordionItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [answer]);

  return (
    <div className="border-b border-navy-100 dark:border-navy-700/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-navy-700 dark:text-white">{question}</span>
        <ChevronDown
          size={18}
          className={cx("shrink-0 text-navy-400 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: isOpen ? height : 0 }}>
        <div ref={ref} className="pb-5 text-sm leading-7 text-navy-500 dark:text-navy-400">{answer}</div>
      </div>
    </div>
  );
}

export function PricingPage(): JSX.Element {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      name: "Starter", audience: "Small teams", priceMonthly: "$19", priceAnnual: "$15", period: "/mo",
      features: ["1 agent seat", "Basic live chat", "Email support", "14-day chat history", "1 website"],
      cta: "Get started", highlighted: false,
    },
    {
      name: "Team", audience: "Growing support teams", priceMonthly: "$39", priceAnnual: "$31", period: "/agent/mo",
      features: ["Unlimited agents", "AI suggestions", "Integrations", "Reports & analytics", "3 websites", "1-year history", "Chatbot"],
      cta: "Start free trial", highlighted: true, badge: "Recommended",
    },
    {
      name: "Business", audience: "Established departments", priceMonthly: "$59", priceAnnual: "$47", period: "/agent/mo",
      features: ["Everything in Team", "Automation workflows", "Advanced chatbot", "AI Copilot", "5 websites", "Unlimited history", "SLA policies"],
      cta: "Start free trial", highlighted: false,
    },
    {
      name: "Enterprise", audience: "Large organizations", priceMonthly: "Custom", priceAnnual: "Custom", period: "",
      features: ["Everything in Business", "Unlimited everything", "SSO / SAML", "Dedicated support", "SLA guarantee", "Custom contracts"],
      cta: "Contact sales", highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-navy-700 dark:bg-navy-950 dark:text-navy-100">
      <MarketingNavigation />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b border-navy-100/60 dark:border-navy-800/60">
          <div className="pointer-events-none absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-brand-100/30 blur-3xl dark:bg-brand-900/10" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-navy-700 sm:text-5xl dark:text-white">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-navy-500 dark:text-navy-400">
              Start free. No credit card required. Choose the plan that fits your team.
            </p>
            {/* Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50 p-1 dark:border-navy-700 dark:bg-navy-800/50">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={cx(
                  "rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  !annual ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-white" : "text-navy-400 dark:text-navy-400"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={cx(
                  "rounded-lg px-4 py-2 text-sm font-bold transition-all",
                  annual ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-white" : "text-navy-400 dark:text-navy-400"
                )}
              >
                Annual
                <span className="ml-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">Save 20%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cx(
                  "relative flex flex-col p-6 transition-shadow dark:bg-navy-800/60 dark:border-navy-700/50",
                  plan.highlighted && "ring-2 ring-brand-400 shadow-glow dark:ring-brand-500"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-glow">{plan.badge}</span>
                )}
                <h3 className="font-display text-lg font-bold text-navy-700 dark:text-white">{plan.name}</h3>
                <p className="text-sm text-navy-400">{plan.audience}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-navy-700 dark:text-white">
                    {annual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-sm font-medium text-navy-400">{plan.period}</span>
                </div>
                <div className="mt-6 flex-1 grid gap-2.5 text-sm text-navy-500 dark:text-navy-400">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-brand-500" />{f}</div>
                  ))}
                </div>
                <Link
                  to={plan.name === "Enterprise" ? "/contact" : "/signup"}
                  className={cx(
                    "mt-6 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition-all",
                    plan.highlighted
                      ? "bg-brand-500 text-white shadow-glow hover:bg-brand-600 hover:shadow-glow-lg"
                      : plan.name === "Enterprise"
                        ? "border-2 border-navy-200 bg-white text-navy-700 hover:border-navy-300 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-200"
                        : "border border-navy-100 bg-white text-navy-700 hover:border-brand-200 hover:bg-brand-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 dark:hover:border-brand-800"
                  )}
                >
                  {plan.cta}
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* What's included */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
          <Card className="p-6 sm:p-8 dark:bg-navy-800/40 dark:border-navy-700/50">
            <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">What every plan includes</h3>
            <div className="mt-5 grid gap-3 text-sm text-navy-500 sm:grid-cols-2 dark:text-navy-400">
              {[
                "Real-time messaging workspace",
                "Widget deployment and customization",
                "Routing and automation tools",
                "Analytics dashboards and exports",
                "Secure data encryption",
                "24/7 infrastructure uptime",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-brand-500" />{item}</div>
              ))}
            </div>
          </Card>
        </section>

        {/* FAQ */}
        <section className="border-t border-navy-100/60 dark:border-navy-800/60">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-center text-3xl font-extrabold tracking-tight text-navy-700 dark:text-white">Frequently asked questions</h2>
            <div className="mt-10">
              {pricingFaqs.map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTASection />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ================================================================
   PUBLIC LAYOUT (used by remaining pages)
   ================================================================ */

function PublicLayout({ title, subtitle, children }: { title: string; subtitle: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-navy-700 dark:bg-navy-950 dark:text-navy-100">
      <MarketingNavigation />

      <main>
        <section className="relative border-b border-navy-100 bg-navy-50 dark:border-navy-800 dark:bg-navy-900/30">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-100/40 blur-3xl dark:bg-brand-900/10" />
          <div className="pointer-events-none absolute right-0 top-32 h-80 w-80 rounded-full bg-brand-50/50 blur-3xl dark:bg-brand-950/10" />
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-600 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400"><Sparkles size={16} /> FlowLyra</div>
              <h1 className="font-display mt-5 max-w-4xl text-4xl font-extrabold tracking-[-0.04em] text-navy-700 sm:text-5xl lg:text-6xl dark:text-white">{title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-navy-500 sm:text-lg dark:text-navy-400">{subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/signup"><Button className="h-12 rounded-xl px-6 bg-brand-500 text-white hover:bg-brand-600 shadow-glow hover:shadow-glow-lg">Start free</Button></Link>
                <Link to="/product-tour"><Button variant="secondary" className="h-12 rounded-xl px-6">View product tour</Button></Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand-100/30 blur-2xl dark:bg-brand-900/10" />
              <Card className="relative overflow-hidden rounded-[2rem] border-white/80 bg-white/90 p-5 shadow-lift backdrop-blur sm:p-6 dark:bg-navy-800/80 dark:border-navy-700/50">
                <div className="flex items-center justify-between gap-3">
                  <img src={flowlyraLogo} alt="FlowLyra logo" className="h-12 w-auto" />
                  <Pill tone="green" className="rounded-full">Live</Pill>
                </div>
                <div className="mt-5 rounded-3xl bg-navy-900 p-4 text-white dark:bg-navy-950">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-300"><span className="h-2 w-2 rounded-full bg-brand-500" /> Visitor from page</div>
                  <div className="mt-4 rounded-2xl bg-white/10 p-3 text-sm">Hi, I'd like to learn more about your features.</div>
                  <div className="ml-auto mt-3 max-w-[85%] rounded-2xl bg-brand-500 p-3 text-sm shadow-lg">Of course! I can walk you through everything.</div>
                </div>
                <div className="mt-5 grid gap-2 text-sm">
                  <Metric label="Live channels" value="Web + social + email" />
                  <Metric label="Automation" value="Rules + AI assistance" />
                </div>
              </Card>
            </div>
          </div>
        </section>

        {children}
      </main>

      <footer className="border-t border-navy-100 bg-navy-900 text-navy-300 dark:border-navy-800">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <img src={flowlyraMark} alt="" className="h-9 w-9 rounded-xl" />
              <span className="font-display text-lg font-extrabold text-white">FlowLyra</span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-navy-400">Conversations that move.</p>
          </div>
          <FooterColumn title="Product" links={[{ to: "/features", label: "Features" }, { to: "/pricing", label: "Pricing" }, { to: "/product-tour", label: "Product Tour" }, { to: "/integrations", label: "Integrations" }]} />
          <FooterColumn title="Solutions" links={solutionLinks} />
          <FooterColumn title="Company" links={[{ to: "/customers", label: "Customers" }, { to: "/contact", label: "Contact" }, { to: "/help", label: "Help Center" }, { to: "/status", label: "System Status" }, { to: "/privacy", label: "Privacy" }, { to: "/terms", label: "Terms" }]} />
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <p className="text-center text-xs text-navy-400">&copy; {new Date().getFullYear()} FlowLyra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ================================================================
   SHARED SECTIONS (for non-Home/Pricing pages)
   ================================================================ */

function FeatureGrid(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-700 sm:text-3xl dark:text-white">Everything needed for production support operations</h2>
        <Link to="/features" className="hidden items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600 sm:inline-flex">All features <ChevronRight size={16} /></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coreFeatures.map((feature) => (
          <Card key={feature.title} className="p-5 dark:bg-navy-800/60 dark:border-navy-700/50">
            <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/30 dark:text-brand-400"><feature.icon size={20} /></div>
            <h3 className="font-display mt-3 text-lg font-bold text-navy-700 dark:text-white">{feature.title}</h3>
            <div className="mt-3 grid gap-2">
              {feature.items.map((item) => (
                <div key={item} className="inline-flex items-center gap-2 text-sm text-navy-500 dark:text-navy-400"><CheckCircle2 size={15} className="text-brand-500" />{item}</div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function IntegrationsBlock(): JSX.Element {
  return (
    <section className="border-y border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900/20">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-navy-700 sm:text-3xl dark:text-white">Connect FlowLyra to your existing stack</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-navy-500 sm:text-base dark:text-navy-400">Prebuilt integrations and webhook-ready APIs keep your data in sync.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {integrationsList.map((item) => (
            <div key={item} className="rounded-lg border border-navy-100 bg-navy-50 px-3 py-3 text-center text-sm font-semibold text-navy-500 dark:border-navy-700 dark:bg-navy-800/40 dark:text-navy-400">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASectionInner(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Card className="overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white dark:from-brand-600 dark:to-brand-800">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Launch-ready customer operations</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-100 sm:text-base">Deploy FlowLyra with production routing, analytics, and multi-team collaboration.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup"><Button className="bg-white text-brand-600 hover:bg-brand-50 border-0">Start free trial</Button></Link>
            <Link to="/contact"><Button variant="secondary" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Talk to sales</Button></Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ================================================================
   REMAINING EXPORTED PAGES
   ================================================================ */

export function FeaturesPage(): JSX.Element {
  return (
    <PublicLayout
      title="Features designed for support quality and sales performance"
      subtitle="From real-time chat handling to AI assistance and reporting, FlowLyra covers the entire customer conversation lifecycle."
    >
      <>
        <FeatureGrid />
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Team management</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Groups, roles, workload controls, and routing logic keep agents efficient and conversations assigned correctly.</p>
              <div className="mt-4 grid gap-2 text-sm text-navy-500 dark:text-navy-400">
                <div className="inline-flex items-center gap-2"><Users size={16} className="text-brand-500" />Agent roles and permissions</div>
                <div className="inline-flex items-center gap-2"><Layers3 size={16} className="text-brand-500" />Multi-team routing groups</div>
                <div className="inline-flex items-center gap-2"><LifeBuoy size={16} className="text-brand-500" />Escalation-safe transfer flow</div>
              </div>
            </Card>
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Platform reliability</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Production environments need observability, consistency, and secure controls by default.</p>
              <div className="mt-4 grid gap-2 text-sm text-navy-500 dark:text-navy-400">
                <div className="inline-flex items-center gap-2"><Lock size={16} className="text-brand-500" />Role-based access boundaries</div>
                <div className="inline-flex items-center gap-2"><Network size={16} className="text-brand-500" />API + widget integration patterns</div>
                <div className="inline-flex items-center gap-2"><Headphones size={16} className="text-brand-500" />Operational workflows for busy teams</div>
              </div>
            </Card>
          </div>
        </section>
        <CTASectionInner />
      </>
    </PublicLayout>
  );
}

function SolutionPage({ title, subtitle, points }: { title: string; subtitle: string; points: Array<{ icon: JSX.Element; title: string; detail: string }> }): JSX.Element {
  return (
    <PublicLayout title={title} subtitle={subtitle}>
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-6 flex flex-wrap gap-2">
            {solutionLinks.map((item) => (
              <Link key={item.to} to={item.to}><Button size="sm" variant="secondary">{item.label}</Button></Link>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {points.map((point) => (
              <Card key={point.title} className="p-5 dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/30 dark:text-brand-400">{point.icon}</div>
                <h3 className="font-display mt-3 text-lg font-bold text-navy-700 dark:text-white">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">{point.detail}</p>
              </Card>
            ))}
          </div>
        </section>
        <CTASectionInner />
      </>
    </PublicLayout>
  );
}

export function SolutionSupportPage(): JSX.Element {
  return (
    <SolutionPage
      title="Customer support that protects satisfaction and retention"
      subtitle="Route customers to the right team, resolve faster, and maintain service quality with operational visibility."
      points={[
        { icon: <Workflow size={20} />, title: "Smart routing", detail: "Match incoming conversations to the right queue by page, profile, and business rules." },
        { icon: <Headphones size={20} />, title: "Faster response", detail: "Use canned responses, AI drafting, and context-rich timelines to reduce response times." },
        { icon: <LineChart size={20} />, title: "Quality tracking", detail: "Monitor CSAT, wait time, and resolution patterns to improve team-level performance." },
      ]}
    />
  );
}

export function SolutionSalesPage(): JSX.Element {
  return (
    <SolutionPage
      title="Sales and marketing workflows that convert intent into revenue"
      subtitle="Engage high-intent visitors at the right moment and guide them toward clear next actions."
      points={[
        { icon: <Sparkles size={20} />, title: "Targeted outreach", detail: "Launch contextual greetings on high-conversion pages and campaigns." },
        { icon: <MessageSquareText size={20} />, title: "Guided buying", detail: "Share key details in chat and move prospects from questions to purchase decisions." },
        { icon: <LineChart size={20} />, title: "Conversion analytics", detail: "Track chat-driven outcomes and tune scripts, routing, and handoff workflows." },
      ]}
    />
  );
}

export function SolutionEnterprisePage(): JSX.Element {
  return (
    <SolutionPage
      title="Enterprise governance with secure, scalable chat operations"
      subtitle="Support global teams with role controls, predictable processes, and multi-team operational governance."
      points={[
        { icon: <Lock size={20} />, title: "Control and compliance", detail: "Enforce strict access boundaries and secure data handling practices." },
        { icon: <Network size={20} />, title: "System integration", detail: "Integrate with enterprise CRM, workflow, and reporting systems." },
        { icon: <Users size={20} />, title: "Large-team operations", detail: "Coordinate many teams with clear ownership, routing, and escalation patterns." },
      ]}
    />
  );
}

export function IntegrationsPage(): JSX.Element {
  return (
    <PublicLayout
      title="Integrations that keep your entire customer stack connected"
      subtitle="Unify data between chat, CRM, marketing tools, and internal operations so your team never works blind."
    >
      <>
        <IntegrationsBlock />
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Marketplace integrations</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Quickly connect tools already used by support, marketing, and commerce teams.</p>
            </Card>
            <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
              <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">Developer-friendly APIs</h3>
              <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">Use webhooks and APIs for custom workflows, event pipelines, and enterprise sync jobs.</p>
            </Card>
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

export function CustomersPage(): JSX.Element {
  return (
    <PublicLayout
      title="Trusted by teams that treat support as a growth engine"
      subtitle="FlowLyra helps companies improve service outcomes while increasing conversion opportunities in customer conversations."
    >
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { stat: "35,000+", label: "Businesses using live-chat style support platforms" },
              { stat: "30%", label: "Typical conversion lift reported after chat implementation" },
              { stat: "24/7", label: "Always-on customer coverage through asynchronous messaging" },
            ].map((item) => (
              <Card key={item.label} className="p-6 text-center dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="font-display text-4xl font-extrabold gradient-text">{item.stat}</div>
                <p className="mt-2 text-sm text-navy-500 dark:text-navy-400">{item.label}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={14} className="fill-brand-400 text-brand-400" />)}
                </div>
                <p className="mt-3 text-sm leading-6 text-navy-600 dark:text-navy-300">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-3 text-sm font-bold text-navy-700 dark:text-white">{t.name}</div>
                <div className="text-xs text-navy-400">{t.role}, {t.company}</div>
              </Card>
            ))}
          </div>
        </section>
        <CTASectionInner />
      </>
    </PublicLayout>
  );
}

export function ProductTourPage(): JSX.Element {
  return (
    <PublicLayout
      title="Take a product tour before launch"
      subtitle="Review the full operation flow from visitor engagement to reporting so teams can deploy with confidence."
    >
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Operator workspace", desc: "Inbox, tickets, contacts, and unified chat handling for day-to-day operations." },
              { title: "Admin console", desc: "Routing, triggers, widget config, team management, and install controls." },
              { title: "Analytics and quality", desc: "Track response speed, CSAT, staffing pressure, and team output trends." },
              { title: "Deployment readiness", desc: "Widget embed snippets, API endpoints, and environment templates for production rollout." },
            ].map((item) => (
              <Card key={item.title} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
                <h3 className="font-display text-xl font-bold text-navy-700 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

function FAQCard({ q, a }: { q: string; a: string }): JSX.Element {
  return (
    <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
      <h3 className="font-display text-lg font-bold text-navy-700 dark:text-white">{q}</h3>
      <p className="mt-2 text-sm leading-6 text-navy-500 dark:text-navy-400">{a}</p>
    </Card>
  );
}

export function HelpPage(): JSX.Element {
  return (
    <PublicLayout
      title="Help center and implementation guidance"
      subtitle="Get quick answers, deployment steps, and operational troubleshooting so your launch stays on schedule."
    >
      <>
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4 md:grid-cols-2">
            <FAQCard q="How do I install the widget?" a="Use the script snippet from the Install page and set window.FlowLyraConfig with your org slug and API URL." />
            <FAQCard q="How do I configure routing?" a="Define rules in Admin > Routing and segment by page context, team ownership, or customer attributes." />
            <FAQCard q="How do I monitor quality?" a="Use Analytics dashboards to monitor response times, CSAT, and missed conversation trends." />
            <FAQCard q="Can I integrate with CRM tools?" a="Yes, use built-in integrations and API/webhook workflows for custom enterprise sync." />
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

export function ContactPage(): JSX.Element {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/public/contact", { full_name: fullName, email, company: company || undefined, message });
      toast.success("Request sent");
      setFullName(""); setEmail(""); setCompany(""); setMessage("");
    } catch {
      toast.error("Could not send request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout title="Contact FlowLyra" subtitle="Speak with product and implementation support for pricing, migration, and production launch planning.">
      <>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 sm:p-7 dark:bg-navy-800/60 dark:border-navy-700/50">
            <form onSubmit={(event) => void submit(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Full name
                  <input required className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Work email
                  <input required type="email" className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                Company
                <input className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                Message
                <textarea required minLength={10} className="min-h-28 rounded-lg border border-navy-200 bg-white px-3 py-2 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Tell us what you need" value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <Button type="submit" disabled={submitting} className="mt-5 bg-brand-500 text-white hover:bg-brand-600">{submitting ? "Sending..." : "Send request"}</Button>
            </form>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function StatusPage(): JSX.Element {
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api.get<{ items: PublicIncident[] }>("/public/status/incidents")
      .then(({ data }) => { if (!alive) return; setIncidents(data.items || []); })
      .catch(() => { if (!alive) return; setIncidents([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const active = incidents.filter((item) => item.status !== "resolved");
  const stateText = loading ? "Checking..." : active.length ? `${active.length} active incident${active.length === 1 ? "" : "s"}` : "All systems operational";

  return (
    <PublicLayout title="System status" subtitle="Current service health for chat delivery, widget infrastructure, and API platform.">
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
            <div className={cx("inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold", active.length ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700")}>
              <CheckCircle2 size={16} /> {stateText}
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              {["Realtime chat", "Widget CDN", "REST API", "Agent dashboard"].map((s) => <Metric key={s} label={s} value="Operational" />)}
            </div>
            <div className="mt-6 grid gap-3">
              {incidents.length === 0 && !loading ? <div className="text-sm text-navy-400">No incidents published recently.</div> : null}
              {incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl border border-navy-100 bg-navy-50 p-4 dark:border-navy-700 dark:bg-navy-900/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-navy-700 dark:text-white">{incident.title}</span>
                    <span className="rounded-full bg-navy-900 px-2 py-1 text-[11px] font-bold uppercase text-white dark:bg-navy-700">{incident.status}</span>
                    <span className="rounded-full border border-navy-200 px-2 py-1 text-[11px] font-bold uppercase text-navy-500 dark:border-navy-600">{incident.impact}</span>
                  </div>
                  {incident.body ? <p className="mt-2 text-sm leading-6 text-navy-600 dark:text-navy-300">{incident.body}</p> : null}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function BlogPage(): JSX.Element {
  const [posts, setPosts] = useState<PublicBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api.get<{ items: PublicBlogPost[] }>("/public/blog/posts")
      .then(({ data }) => { if (!alive) return; setPosts(data.items || []); })
      .catch(() => { if (!alive) return; setPosts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <PublicLayout title="FlowLyra blog" subtitle="Product updates, operational playbooks, and support/sales best practices.">
      <>
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-4">
            {loading ? <Card className="p-6 text-sm text-navy-400 dark:bg-navy-800/60 dark:border-navy-700/50">Loading posts...</Card> : null}
            {!loading && posts.length === 0 ? <Card className="p-6 text-sm text-navy-400 dark:bg-navy-800/60 dark:border-navy-700/50">No posts published yet.</Card> : null}
            {posts.map((post) => (
              <Card key={post.id} className="p-6 dark:bg-navy-800/60 dark:border-navy-700/50">
                <div className="text-xs font-bold uppercase text-navy-400">{post.published_at ? formatDate(post.published_at) : "Draft"}</div>
                <h2 className="font-display mt-2 text-2xl font-bold text-navy-700 dark:text-white"><Link to={`/blog/${post.slug}`} className="hover:underline">{post.title}</Link></h2>
                <p className="mt-2 text-sm leading-7 text-navy-500 dark:text-navy-400">{post.excerpt || "No excerpt provided."}</p>
                {post.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400">{tag}</span>)}</div> : null}
              </Card>
            ))}
          </div>
        </section>
      </>
    </PublicLayout>
  );
}

export function BlogPostPage(): JSX.Element {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!slug) return () => { alive = false; };
    void api.get<{ item: PublicBlogPost }>(`/public/blog/posts/${slug}`)
      .then(({ data }) => { if (!alive) return; setPost(data.item ?? null); })
      .catch(() => { if (!alive) return; setPost(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <PublicLayout title={post?.title || "Blog article"} subtitle={post?.excerpt || "Latest updates from the FlowLyra team."}>
      <>
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          {loading ? <Card className="p-6 text-sm text-navy-400">Loading article...</Card> : null}
          {!loading && !post ? <Card className="p-6 text-sm text-navy-400">Article not found.</Card> : null}
          {post ? (
            <Card className="p-6 sm:p-8 dark:bg-navy-800/60 dark:border-navy-700/50">
              <div className="text-xs font-bold uppercase text-navy-400">{post.published_at ? formatDate(post.published_at) : "Draft"}</div>
              <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-navy-700 dark:text-white">{post.title}</h1>
              {post.tags.length ? <div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-bold text-brand-600">{tag}</span>)}</div> : null}
              <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
                {renderMarkdownAsParagraphs(post.content_markdown)}
              </div>
            </Card>
          ) : null}
        </section>
      </>
    </PublicLayout>
  );
}

export function PrivacyPage(): JSX.Element {
  return (
    <PublicLayout title="Privacy policy" subtitle="How FlowLyra handles customer and operational data in the platform.">
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Card className="grid gap-4 p-6 text-sm leading-7 text-navy-600 dark:bg-navy-800/60 dark:border-navy-700/50 dark:text-navy-300">
          <h2 className="font-display text-xl font-bold text-navy-700 dark:text-white">Data handling principles</h2>
          <p>FlowLyra processes support conversation data, operator metadata, and configuration settings to provide service functionality and reporting.</p>
          <p>Data is accessed according to role-based permissions, and operational access should be restricted to authorized staff only.</p>
          <p>For production use, customers should configure retention policies and compliance workflows based on their legal requirements.</p>
        </Card>
      </section>
    </PublicLayout>
  );
}

export function TermsPage(): JSX.Element {
  return (
    <PublicLayout title="Terms of service" subtitle="Core service usage terms for teams operating FlowLyra in production environments.">
      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Card className="grid gap-4 p-6 text-sm leading-7 text-navy-600 dark:bg-navy-800/60 dark:border-navy-700/50 dark:text-navy-300">
          <h2 className="font-display text-xl font-bold text-navy-700 dark:text-white">Service terms overview</h2>
          <p>Users are responsible for lawful use of messaging channels, data processing, and customer communication practices.</p>
          <p>Account owners manage team permissions, billing obligations, and integration usage under their organization workspace.</p>
          <p>FlowLyra may update platform functionality over time to maintain reliability, security, and product quality.</p>
        </Card>
      </section>
    </PublicLayout>
  );
}

export function SignupPage(): JSX.Element {
  const signup = useAuthStore((state) => state.signup);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup({ full_name: fullName, email, password, organization_name: organizationName, organization_slug: organizationSlug || undefined });
      navigate("/inbox");
    } catch {
      setError("Signup failed. Please review your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout title="Start your FlowLyra trial" subtitle="Create your workspace and deploy a production-ready support flow in minutes.">
      <>
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Card className="p-6 sm:p-7 dark:bg-navy-800/60 dark:border-navy-700/50">
            {error && <div className="mb-4 rounded-xl bg-danger-50 p-3 text-sm font-semibold text-danger-500">{error}</div>}
            <form onSubmit={(event) => void submit(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Full name
                  <input required className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Work email
                  <input required type="email" className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Company
                  <input required className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Company name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                  Workspace slug
                  <input className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="my-company" value={organizationSlug} onChange={(e) => setOrganizationSlug(e.target.value)} />
                </label>
              </div>
              <label className="mt-4 grid gap-2 text-sm font-semibold text-navy-600 dark:text-navy-300">
                Password
                <input required type="password" minLength={8} className="h-10 rounded-lg border border-navy-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-800 dark:text-white" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <Button type="submit" disabled={submitting} className="mt-5 w-full bg-brand-500 text-white hover:bg-brand-600">{submitting ? "Creating workspace..." : "Create free account"}</Button>
            </form>
          </Card>
        </section>
      </>
    </PublicLayout>
  );
}

export function NotFoundPage(): JSX.Element {
  return (
    <PublicLayout title="404" subtitle="The page you're looking for doesn't exist.">
      <section className="mx-auto grid max-w-md place-items-center px-4 py-20 text-center">
        <div className="font-display text-8xl font-extrabold gradient-text">404</div>
        <p className="mt-4 text-navy-500 dark:text-navy-400">This page could not be found. Check the URL or head back to the homepage.</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-600">Back to homepage</Link>
      </section>
    </PublicLayout>
  );
}

/* ================================================================
   UTILITIES
   ================================================================ */

function renderMarkdownAsParagraphs(markdown: string): JSX.Element[] {
  return markdown.split(/\n\n+/).map((block, i) => {
    if (block.startsWith("### ")) return <h3 key={i} className="font-display mt-6 text-lg font-bold text-navy-700 dark:text-white">{block.replace("### ", "")}</h3>;
    if (block.startsWith("## ")) return <h2 key={i} className="font-display mt-8 text-xl font-bold text-navy-700 dark:text-white">{block.replace("## ", "")}</h2>;
    if (block.startsWith("# ")) return <h1 key={i} className="font-display mt-8 text-2xl font-bold text-navy-700 dark:text-white">{block.replace("# ", "")}</h1>;
    return <p key={i} className="mt-3 leading-7 text-navy-500 dark:text-navy-400">{block.replace(/\n/g, "<br />")}</p>;
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
