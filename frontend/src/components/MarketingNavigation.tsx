import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { cx } from "./ui";

const marketingNavLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/solutions/customer-support", label: "Solutions" },
  { to: "/integrations", label: "Integrations" },
  { to: "/customers", label: "Customers" },
];

function FlowlyraLogo(): JSX.Element {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Flowlyra home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 shadow-sm ring-1 ring-slate-200/70">
        <svg viewBox="0 0 36 36" aria-hidden="true" className="h-7 w-7">
          <defs>
            <linearGradient id="flowlyra-nav-mark" x1="4" y1="6" x2="32" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="0.55" stopColor="#7C3AED" />
              <stop offset="1" stopColor="#F97066" />
            </linearGradient>
          </defs>
          <path
            d="M7 14.5C10.2 8.8 17.7 7.8 22.1 11.8l2.1 1.9c1.7 1.5 4.1 1.2 5.8-.6"
            fill="none"
            stroke="url(#flowlyra-nav-mark)"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M6 22.2c3.5 5.4 11.2 6.2 15.4 1.9l2.2-2.2c1.6-1.6 4.2-1.5 6.2.2"
            fill="none"
            stroke="url(#flowlyra-nav-mark)"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="font-sans text-xl font-semibold tracking-[-0.02em] text-midnight">Flowlyra</span>
    </Link>
  );
}

function PrimaryCta({ className = "", onClick }: { className?: string; onClick?: () => void }): JSX.Element {
  return (
    <Link
      to="/signup"
      onClick={onClick}
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-[15px] font-semibold leading-none text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-glow-indigo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 active:scale-[0.97] active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      Start flowing free
    </Link>
  );
}

export function MarketingNavigation(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 h-[72px] border-b border-[rgba(226,232,240,0.6)] backdrop-blur-[12px] transition-all duration-200",
        scrolled ? "bg-white/95 shadow-sm" : "bg-white/80",
      )}
      role="banner"
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <FlowlyraLogo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary marketing navigation">
          {marketingNavLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  "group relative py-2 font-sans text-[15px] font-medium text-slate-700 transition-colors duration-200 hover:text-indigo-600",
                  "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-indigo-600 after:transition-transform after:duration-200 hover:after:scale-x-100",
                  isActive && "font-semibold text-indigo-600 after:scale-x-100",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          >
            Log in
          </Link>
          <PrimaryCta />
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <Menu size={24} />
        </button>
      </div>

      <div
        className={cx(
          "fixed inset-0 z-[9999] bg-midnight text-white transition-all duration-300 ease-out md:hidden",
          mobileOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex h-full flex-col px-6 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <Link to="/" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-2.5" aria-label="Flowlyra home">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <svg viewBox="0 0 36 36" aria-hidden="true" className="h-7 w-7">
                  <defs>
                    <linearGradient id="flowlyra-nav-mark-mobile" x1="4" y1="6" x2="32" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4F46E5" />
                      <stop offset="0.55" stopColor="#7C3AED" />
                      <stop offset="1" stopColor="#F97066" />
                    </linearGradient>
                  </defs>
                  <path d="M7 14.5C10.2 8.8 17.7 7.8 22.1 11.8l2.1 1.9c1.7 1.5 4.1 1.2 5.8-.6" fill="none" stroke="url(#flowlyra-nav-mark-mobile)" strokeWidth="4.2" strokeLinecap="round" />
                  <path d="M6 22.2c3.5 5.4 11.2 6.2 15.4 1.9l2.2-2.2c1.6-1.6 4.2-1.5 6.2.2" fill="none" stroke="url(#flowlyra-nav-mark-mobile)" strokeWidth="4.2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="font-sans text-xl font-semibold">Flowlyra</span>
            </Link>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="mt-16 grid gap-6" aria-label="Mobile marketing navigation">
            {marketingNavLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cx("text-[18px] font-medium text-white/85 transition-colors hover:text-white", isActive && "font-semibold text-white")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto grid gap-3 border-t border-white/10 pt-6">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-white/15 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
            <PrimaryCta onClick={() => setMobileOpen(false)} className="w-full hover:shadow-glow-indigo" />
          </div>
        </div>
      </div>
    </header>
  );
}
