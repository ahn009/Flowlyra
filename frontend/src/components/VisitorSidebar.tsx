import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, Clock, MapPin, MessageSquare, X } from "lucide-react";
import { getVisitorInfo, type VisitorGeoInfo } from "../services/geoService";
import { trackPageVisit, getChatDuration, getSessionSummary, startChatSession, type SessionSummary } from "../services/sessionTracker";
import { VisitorMap } from "./VisitorMap";
import { PreChatForm, type PreChatData } from "./PreChatForm";

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "V";
}

function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function VisitorSidebar(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [geoInfo, setGeoInfo] = useState<VisitorGeoInfo | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [preChatDone, setPreChatDone] = useState(false);
  const [preChatData, setPreChatData] = useState<PreChatData | null>(null);
  const [localTime, setLocalTime] = useState("");
  const [chatDuration, setChatDuration] = useState("0s");

  const [additionalOpen, setAdditionalOpen] = useState(true);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [preChatOpen, setPreChatOpen] = useState(true);
  const [techOpen, setTechOpen] = useState(true);
  const [integrationsOpen, setIntegrationsOpen] = useState(true);

  const location = useLocation();

  // Track every route change
  useEffect(() => {
    trackPageVisit(window.location.href, document.title);
    setSession(getSessionSummary());
  }, [location.pathname]);

  // Load saved pre-chat data once
  useEffect(() => {
    try {
      const name = localStorage.getItem("flowlyra_visitor_name") ?? "";
      const email = localStorage.getItem("flowlyra_visitor_email") ?? "";
      if (name || email) {
        setPreChatData({ name, email });
        setPreChatDone(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Lazy-fetch geo only when sidebar first opens
  useEffect(() => {
    if (!open || geoInfo || geoLoading) return;
    setGeoLoading(true);
    getVisitorInfo()
      .then((info) => {
        setGeoInfo(info);
        setLocalTime(info.localTime);
        setGeoError(info.ip === "unavailable");
      })
      .catch(() => setGeoError(true))
      .finally(() => setGeoLoading(false));
  }, [open, geoInfo, geoLoading]);

  // Update local time every 60s
  useEffect(() => {
    if (!open || !geoInfo?.timezone) return;
    const t = setInterval(() => {
      try {
        setLocalTime(new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: geoInfo.timezone }).format(new Date()));
      } catch { /* ignore */ }
    }, 60000);
    return () => clearInterval(t);
  }, [open, geoInfo?.timezone]);

  // Live chat duration ticker
  useEffect(() => {
    if (!open || !preChatDone) return;
    const t = setInterval(() => setChatDuration(getChatDuration()), 1000);
    return () => clearInterval(t);
  }, [open, preChatDone]);

  // Refresh session when opening
  useEffect(() => {
    if (open) setSession(getSessionSummary());
  }, [open]);

  const visitorName = preChatData?.name || "Website Visitor";
  const visitorEmail = preChatData?.email || "";
  const geoLocation = [geoInfo?.city, geoInfo?.country].filter(Boolean).join(", ");

  return (
    <>
      {open && <div className="fixed inset-0 z-[180] bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Toggle button — always visible when sidebar is closed */}
      {!open && (
        <button
          className="fixed bottom-[72px] right-5 z-[170] flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl transition hover:bg-brand-600"
          onClick={() => setOpen(true)}
          aria-label="Open visitor info panel"
          title="Visitor Info"
        >
          <MessageSquare size={20} />
        </button>
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[190] flex w-80 flex-col overflow-y-auto border-l border-navy-100 bg-white shadow-2xl transition-transform duration-300 dark:border-navy-700 dark:bg-navy-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-navy-100 px-5 py-4 dark:border-navy-700">
          <span className="text-sm font-semibold text-navy-700 dark:text-navy-100">Visitor Info</span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-800"
            onClick={() => setOpen(false)}
            aria-label="Close visitor panel"
          >
            <X size={15} />
          </button>
        </div>

        {/* Section 1: Profile */}
        <div className="shrink-0 border-b border-navy-100 px-5 py-5 text-center dark:border-navy-700">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-xl font-bold text-orange-600">
            {initials(visitorName)}
          </div>
          <div className="mt-3 text-base font-semibold text-navy-700 dark:text-navy-100">{visitorName}</div>
          {visitorEmail && <div className="mt-1 text-sm text-brand-500">{visitorEmail}</div>}
          {geoLocation && (
            <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-navy-400">
              <MapPin size={11} /> {geoLocation}
            </div>
          )}
          <div className="mt-1 flex items-center justify-center gap-1 text-xs text-navy-400">
            <Clock size={11} />
            {localTime ? `${localTime} local time` : "—"}
          </div>
        </div>

        {/* Section 2: Map */}
        <div className="shrink-0 border-b border-navy-100 dark:border-navy-700">
          {geoLoading && (
            <div className="flex h-44 items-center justify-center bg-navy-50 dark:bg-navy-800">
              <span className="text-xs text-navy-400">Loading map…</span>
            </div>
          )}
          {!geoLoading && geoError && (
            <div className="flex h-28 items-center justify-center bg-navy-50 dark:bg-navy-800">
              <div className="text-center">
                <MapPin size={18} className="mx-auto mb-1 text-danger-400" />
                <div className="text-xs text-navy-400">Location unavailable</div>
              </div>
            </div>
          )}
          {!geoLoading && !geoError && geoInfo && geoInfo.latitude !== 0 && (
            <VisitorMap latitude={geoInfo.latitude} longitude={geoInfo.longitude} city={geoInfo.city} country={geoInfo.country} />
          )}
        </div>

        <div className="divide-y divide-navy-100 dark:divide-navy-700">
          {/* Section 3: Additional info */}
          <SidebarSection title="Additional info" open={additionalOpen} onToggle={() => setAdditionalOpen((v) => !v)}>
            {session && (
              <>
                <InfoRow label="Returning visitor" value={`${session.visitCount} visit${session.visitCount !== 1 ? "s" : ""}, ${session.chatCount} chat${session.chatCount !== 1 ? "s" : ""}`} />
                {session.lastSeen && <InfoRow label="Last seen" value={formatRelative(session.lastSeen)} />}
                {preChatDone && <InfoRow label="Chat duration" value={chatDuration} />}
              </>
            )}
            <InfoRow label="Groups" value="General" />
          </SidebarSection>

          {/* Section 4: Visited pages */}
          <SidebarSection title="Visited pages" open={pagesOpen} onToggle={() => setPagesOpen((v) => !v)}>
            {session && session.visitedPages.length > 0 ? (
              <div className="grid gap-3">
                {[...session.visitedPages].reverse().slice(0, 8).map((page, i) => (
                  <div key={i}>
                    <a href={page.url} target="_blank" rel="noreferrer" className="truncate text-xs font-medium text-brand-500 hover:underline" title={page.url}>
                      {page.title || page.url}
                    </a>
                    <div className="mt-0.5 text-[11px] text-navy-400">{formatDuration(page.timeSpent)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-navy-400">No page history available.</div>
            )}
          </SidebarSection>

          {/* Section 5: Pre-chat form */}
          <SidebarSection title="Pre-chat form" open={preChatOpen} onToggle={() => setPreChatOpen((v) => !v)}>
            {preChatDone && preChatData ? (
              <>
                {preChatData.name && <InfoRow label="Name" value={preChatData.name} />}
                {preChatData.email && <InfoRow label="E-mail" value={preChatData.email} accent />}
                <button
                  className="mt-1 text-left text-[11px] font-medium text-brand-500 hover:underline"
                  onClick={() => { setPreChatDone(false); setPreChatData(null); }}
                >
                  Edit
                </button>
              </>
            ) : (
              <PreChatForm
                onSubmit={(data) => {
                  setPreChatData(data);
                  setPreChatDone(true);
                }}
              />
            )}
          </SidebarSection>

          {/* Section 6: Technology */}
          <SidebarSection title="Technology" open={techOpen} onToggle={() => setTechOpen((v) => !v)}>
            {geoLoading && <div className="text-xs text-navy-400">Loading…</div>}
            {!geoLoading && geoInfo ? (
              <>
                {geoInfo.ip !== "unavailable" && <InfoRow label="IP address" value={geoInfo.ip} />}
                {geoInfo.os && <InfoRow label="OS / Device" value={geoInfo.device ? `${geoInfo.os} / ${geoInfo.device}` : geoInfo.os} />}
                {geoInfo.browser && <InfoRow label="Browser" value={geoInfo.browser} />}
                {geoInfo.isp && <InfoRow label="ISP" value={geoInfo.isp} />}
              </>
            ) : (!geoLoading && <div className="text-xs text-navy-400">No technology data.</div>)}
          </SidebarSection>

          {/* Section 7: Integrations data */}
          <SidebarSection title="Integrations data" open={integrationsOpen} onToggle={() => setIntegrationsOpen((v) => !v)}>
            {preChatData?.name && <InfoRow label="default_Name" value={preChatData.name} />}
            {preChatData?.email && <InfoRow label="default_E-mail" value={preChatData.email} />}
            {!preChatData?.name && !preChatData?.email && <div className="text-xs text-navy-400">No integrations data.</div>}
          </SidebarSection>
        </div>
      </div>
    </>
  );
}

function SidebarSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }): JSX.Element {
  return (
    <div className="shrink-0">
      <button
        className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-wider text-navy-400 transition hover:bg-navy-50 dark:hover:bg-navy-800"
        onClick={onToggle}
      >
        {title}
        <ChevronDown size={14} className={`text-navy-300 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="grid gap-2.5 px-5 pb-4 text-xs">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-navy-400 dark:text-navy-500">{label}</span>
      <span className={`break-all text-right font-medium ${accent ? "text-brand-500" : "text-navy-700 dark:text-navy-200"}`}>{value}</span>
    </div>
  );
}
