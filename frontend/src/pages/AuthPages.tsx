import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Building2, ArrowRight, Sparkles } from "lucide-react";
import flowlyraLogo from "../assets/flowlyra-logo.svg";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Card, ThemeToggle, cx } from "../components/ui";

/* ────────────────────────────────────────────────
   Keyframe: fade-in + subtle slide-up
   ──────────────────────────────────────────────── */
const FADE_IN_STYLE = `
@keyframes authFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.auth-fade-in { animation: authFadeIn 0.45s ease-out both; }
.auth-fade-in-delay { animation: authFadeIn 0.45s ease-out 0.12s both; }
`;

/* ────────────────────────────────────────────────
   Shared: Auth Shell (full-page centered card)
   ──────────────────────────────────────────────── */
function AuthShell({
  children,
  showSso = false,
  footer,
}: {
  children: ReactNode;
  showSso?: boolean;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <>
      <style>{FADE_IN_STYLE}</style>

      <main className="relative grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.07),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.04),transparent_36%),linear-gradient(175deg,#F8FAFC_0%,#F1F5F9_50%,#EEF2FF_100%)] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.10),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.06),transparent_36%),linear-gradient(175deg,#0F172A_0%,#1E293B_50%,#0F172A_100%)]">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute left-[10%] top-[8%] h-72 w-72 rounded-full bg-[#4F46E5]/[0.04] blur-3xl dark:bg-[#4F46E5]/[0.08]" />
        <div className="pointer-events-none absolute bottom-[10%] right-[8%] h-96 w-96 rounded-full bg-[#4F46E5]/[0.03] blur-3xl dark:bg-[#4F46E5]/[0.06]" />

        {/* Theme toggle */}
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>

        <Card className="auth-fade-in relative z-0 w-full max-w-md overflow-hidden">
          <div className="px-8 pt-8 pb-6 sm:px-10 sm:pt-10">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center text-center">
              <img src={flowlyraLogo} alt="FlowLyra" className="h-10 w-auto" />
            </div>

            {/* Form content */}
            {children}
          </div>

          {/* SSO divider + buttons */}
          {showSso && (
            <div className="auth-fade-in-delay border-t border-navy-100 px-8 py-6 dark:border-navy-700 sm:px-10">
              <SsoSection />
            </div>
          )}

          {/* Footer */}
          {footer && (
            <div className="border-t border-navy-100 px-8 py-5 dark:border-navy-700 sm:px-10">
              {footer}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}

/* ────────────────────────────────────────────────
   Shared: Heading block
   ──────────────────────────────────────────────── */
function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }): JSX.Element {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight text-navy-700 dark:text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-sm leading-relaxed text-navy-400 dark:text-navy-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Shared: Password input with visibility toggle
   ──────────────────────────────────────────────── */
function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  const [visible, setVisible] = useState(false);
  const { className, ...rest } = props;
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cx(
          "h-11 w-full rounded-xl border border-navy-200 bg-white px-4 pr-11 text-sm outline-none transition placeholder:text-navy-400 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.08] dark:border-navy-700 dark:bg-navy-800/60 dark:text-navy-100 dark:placeholder:text-navy-400 dark:focus:border-[#4F46E5] dark:focus:ring-[#4F46E5]/[0.12]",
          className,
        )}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-navy-400 transition hover:text-navy-500 dark:hover:text-navy-300"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Shared: Styled text input (brand focus)
   ──────────────────────────────────────────────── */
function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className="h-11 w-full rounded-xl border border-navy-200 bg-white px-4 text-sm outline-none transition placeholder:text-navy-400 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.08] dark:border-navy-700 dark:bg-navy-800/60 dark:text-navy-100 dark:placeholder:text-navy-400 dark:focus:border-[#4F46E5] dark:focus:ring-[#4F46E5]/[0.12]"
      {...props}
    />
  );
}

/* ────────────────────────────────────────────────
   Shared: Primary button (brand orange)
   ──────────────────────────────────────────────── */
function PrimaryButton({
  children,
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }): JSX.Element {
  return (
    <button
      className={cx(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-5 text-sm font-semibold text-white shadow-lg shadow-[#4F46E5]/20 transition hover:bg-[#4338CA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[#4F46E5]/10 dark:hover:bg-[#6366F1]",
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

/* ────────────────────────────────────────────────
   Shared: SSO section (Google + Microsoft)
   ──────────────────────────────────────────────── */
function SsoSection(): JSX.Element {
  const [providers, setProviders] = useState<{ name: string; enabled: boolean }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get("/auth/oauth/providers")
      .then((res) => {
        if (alive) {
          setProviders(res.data.providers ?? []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // If API returned providers, show only enabled ones; otherwise show Google & Microsoft as defaults
  const enabledNames = providers.filter((p) => p.enabled).map((p) => p.name.toLowerCase());
  const showGoogle = loaded ? (enabledNames.length > 0 ? enabledNames.includes("google") : true) : true;
  const showMicrosoft = loaded ? (enabledNames.length > 0 ? enabledNames.includes("microsoft") : true) : true;
  const showDynamic = loaded && enabledNames.length > 0 && !enabledNames.includes("google") && !enabledNames.includes("microsoft");

  if (!showGoogle && !showMicrosoft && !showDynamic) return <></>;

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-navy-200 dark:bg-navy-700/60" />
        <span className="text-xs font-medium uppercase tracking-wider text-navy-400 dark:text-navy-400">
          or continue with
        </span>
        <div className="h-px flex-1 bg-navy-200 dark:bg-navy-700/60" />
      </div>

      {/* OAuth buttons */}
      <div className="grid grid-cols-2 gap-3">
        {showGoogle && (
          <SsoButton
            label="Google"
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            }
            onClick={async () => {
              try {
                const res = await api.get("/auth/oauth/google/start");
                window.location.href = res.data.authorize_url;
              } catch {
                // noop
              }
            }}
          />
        )}
        {showMicrosoft && (
          <SsoButton
            label="Microsoft"
            icon={
              <svg viewBox="0 0 21 21" className="h-5 w-5">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            }
            onClick={async () => {
              try {
                const res = await api.get("/auth/oauth/microsoft/start");
                window.location.href = res.data.authorize_url;
              } catch {
                // noop
              }
            }}
          />
        )}
      </div>

      {/* Dynamic providers from API (non-Google/Microsoft) */}
      {showDynamic &&
        providers
          .filter((p) => p.enabled && p.name.toLowerCase() !== "google" && p.name.toLowerCase() !== "microsoft")
          .map((p) => (
            <SsoButton
              key={p.name}
              label={p.name}
              icon={<span className="h-5 w-5" />}
              onClick={async () => {
                try {
                  const res = await api.get(`/auth/oauth/${p.name.toLowerCase()}/start`);
                  window.location.href = res.data.authorize_url;
                } catch {
                  // noop
                }
              }}
            />
          ))}
    </div>
  );
}

function SsoButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-navy-200 bg-white px-4 text-sm font-medium text-navy-600 shadow-sm transition hover:border-navy-200 hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navy-100 active:scale-[0.98] dark:border-navy-700 dark:bg-navy-800/40 dark:text-navy-200 dark:hover:border-navy-600 dark:hover:bg-navy-800 dark:focus-visible:ring-navy-700/40"
    >
      {icon}
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────────
   Shared: Password strength meter
   ──────────────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }): JSX.Element {
  const strength = getPasswordStrength(password);
  if (!password) return <div className="h-1" />;

  const bars = [
    { label: "Weak", color: "bg-red-500", width: "25%" },
    { label: "Fair", color: "bg-amber-500", width: "50%" },
    { label: "Good", color: "bg-blue-500", width: "75%" },
    { label: "Strong", color: "bg-emerald-500", width: "100%" },
  ];
  const active = bars[strength] ?? bars[0];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700">
        <div
          className={cx("rounded-full transition-all duration-300", active.color)}
          style={{ width: active.width }}
        />
      </div>
      <p className="text-xs font-medium text-navy-400 dark:text-navy-400">
        Password strength: <span className="font-semibold">{active.label}</span>
      </p>
    </div>
  );
}

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

/* ────────────────────────────────────────────────
   Shared: Error / success alert
   ──────────────────────────────────────────────── */
function Alert({
  type = "error",
  children,
}: {
  type?: "error" | "success";
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      className={cx(
        "rounded-xl px-4 py-3 text-sm font-medium",
        type === "error" &&
          "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
        type === "success" &&
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
      )}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════
   LOGIN PAGE
   ════════════════════════════════════════════════ */
export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<{ challenge_token: string; methods: string[] } | null>(null);
  const [twofaCode, setTwofaCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);

  const login = useAuthStore((state) => state.login);
  const completeTwoFactor = useAuthStore((state) => state.completeTwoFactor);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  if (user) return <Navigate to="/inbox" replace />;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.challenge_token) {
        setChallenge(result);
        return;
      }
      navigate("/inbox");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit2fa(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    if (!challenge) return;
    try {
      await completeTwoFactor(
        challenge.challenge_token,
        useBackup ? undefined : twofaCode,
        useBackup ? twofaCode : undefined,
      );
      navigate("/inbox");
    } catch {
      setError("Invalid code. Please check and try again.");
    }
  }

  /* ── 2FA challenge view ── */
  if (challenge) {
    return (
      <AuthShell>
        <AuthHeading title="Two-factor authentication" subtitle="Enter your verification code to continue." />
        <form onSubmit={(e) => void submit2fa(e)} className="space-y-4">
          <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
            {useBackup ? "Backup code" : "6-digit code from authenticator"}
            <input
              value={twofaCode}
              onChange={(e) => setTwofaCode(e.target.value)}
              autoFocus
              className="mt-2 h-11 w-full rounded-xl border border-navy-200 bg-white px-4 text-center text-lg tracking-[0.3em] outline-none transition placeholder:text-navy-400 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.08] dark:border-navy-700 dark:bg-navy-800/60 dark:text-navy-100 dark:placeholder:text-navy-400 dark:focus:border-[#4F46E5] dark:focus:ring-[#4F46E5]/[0.12]"
              placeholder="000000"
              maxLength={6}
            />
          </label>
          {error && <Alert type="error">{error}</Alert>}
          <PrimaryButton type="submit" loading={false}>
            Verify
          </PrimaryButton>
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition"
            onClick={() => {
              setUseBackup((v) => !v);
              setTwofaCode("");
            }}
          >
            {useBackup ? "Use TOTP code instead" : "Use a backup code instead"}
          </button>
        </form>
      </AuthShell>
    );
  }

  /* ── Standard login view ── */
  return (
    <AuthShell
      showSso
      footer={
        <p className="text-center text-sm text-navy-400 dark:text-navy-400">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition">
            Start flowing free
          </Link>
        </p>
      }
    >
      <AuthHeading title="Welcome back" subtitle="Sign in to your FlowLyra workspace." />

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {/* Email */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Email
          <StyledInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="mt-1.5"
          />
        </label>

        {/* Password */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Password
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="h-11 w-full rounded-xl border border-navy-200 bg-white px-4 pr-11 text-sm outline-none transition placeholder:text-navy-400 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/[0.08] dark:border-navy-700 dark:bg-navy-800/60 dark:text-navy-100 dark:placeholder:text-navy-400 dark:focus:border-[#4F46E5] dark:focus:ring-[#4F46E5]/[0.12]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-navy-400 transition hover:text-navy-500 dark:hover:text-navy-300"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-navy-200 text-[#4F46E5] focus:ring-[#4F46E5]/20 dark:border-navy-600 dark:bg-navy-800"
            />
            <span className="text-sm text-navy-500 dark:text-navy-400">Remember me</span>
          </label>
          <Link
            to="/reset-password"
            className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition"
          >
            Forgot password?
          </Link>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Sign in button */}
        <PrimaryButton type="submit" loading={loading}>
          Sign in
          <ArrowRight size={16} />
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}

/* ════════════════════════════════════════════════
   SIGNUP PAGE
   ════════════════════════════════════════════════ */
export function SignupPage(): JSX.Element {
  const signup = useAuthStore((state) => state.signup);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      await signup({
        full_name: fullName,
        email,
        password,
        organization_name: company,
      });
      navigate("/inbox");
    } catch {
      setError("Signup failed. Please review your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      showSso
      footer={
        <p className="text-center text-sm text-navy-400 dark:text-navy-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition">
            Sign in
          </Link>
        </p>
      }
    >
      <AuthHeading
        title="Create your account"
        subtitle="Start your free FlowLyra workspace. No credit card required."
      />

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {/* Full name */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Full name
          <div className="relative mt-1.5">
            <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <StyledInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="pl-10"
            />
          </div>
        </label>

        {/* Work email */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Work email
          <div className="relative mt-1.5">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <StyledInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="pl-10"
            />
          </div>
        </label>

        {/* Company name */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Company name
          <div className="relative mt-1.5">
            <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <StyledInput
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              className="pl-10"
            />
          </div>
        </label>

        {/* Password with strength indicator */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Password
          <div className="relative mt-1.5">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="pl-10"
            />
          </div>
          <PasswordStrength password={password} />
        </label>

        {/* Agree to terms */}
        <label className="inline-flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-navy-200 text-[#4F46E5] focus:ring-[#4F46E5]/20 dark:border-navy-600 dark:bg-navy-800"
          />
          <span className="text-sm leading-relaxed text-navy-500 dark:text-navy-400">
            I agree to the{" "}
            <Link to="/terms" className="font-medium text-[#4F46E5] hover:text-[#4338CA] transition">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-[#4F46E5] hover:text-[#4338CA] transition">
              Privacy Policy
            </Link>
          </span>
        </label>

        {error && <Alert type="error">{error}</Alert>}

        {/* Create account button */}
        <PrimaryButton type="submit" loading={loading}>
          <Sparkles size={16} />
          Create account
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}

/* ════════════════════════════════════════════════
   RESET PASSWORD PAGE
   ════════════════════════════════════════════════ */
export function ResetPasswordPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"request" | "confirm">(searchParams.get("token") ? "confirm" : "request");
  const [status, setStatus] = useState<"" | "done" | "error">("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      if (mode === "request") {
        await api.post("/auth/password/reset", { email });
      } else {
        if (newPassword !== confirmPassword) {
          setStatus("error");
          setLoading(false);
          return;
        }
        await api.post("/auth/password/reset/confirm", { token, password: newPassword });
      }
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      footer={
        <p className="text-center text-sm text-navy-400 dark:text-navy-400">
          Remember your password?{" "}
          <Link to="/login" className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition">
            Sign in
          </Link>
        </p>
      }
    >
      {/* Mode tabs */}
      <div className="mb-6 flex rounded-xl bg-navy-100 p-1 dark:bg-navy-800/60">
        <button
          type="button"
          onClick={() => setMode("request")}
          className={cx(
            "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
            mode === "request"
              ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-white"
              : "text-navy-400 hover:text-navy-600 dark:text-navy-400 dark:hover:text-navy-200",
          )}
        >
          Request reset
        </button>
        <button
          type="button"
          onClick={() => setMode("confirm")}
          className={cx(
            "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
            mode === "confirm"
              ? "bg-white text-navy-700 shadow-sm dark:bg-navy-700 dark:text-white"
              : "text-navy-400 hover:text-navy-600 dark:text-navy-400 dark:hover:text-navy-200",
          )}
        >
          Set new password
        </button>
      </div>

      <AuthHeading
        title="Reset your password"
        subtitle={
          mode === "request"
            ? "Enter your email and we'll send you a reset link."
            : "Enter your reset token and choose a new password."
        }
      />

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {mode === "request" ? (
          <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
            Email address
            <div className="relative mt-1.5">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
              <StyledInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="pl-10"
              />
            </div>
          </label>
        ) : (
          <>
            <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
              Reset token
              <StyledInput
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your reset token"
                required
                className="mt-1.5"
              />
            </label>
            <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
              New password
              <div className="mt-1.5">
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <PasswordStrength password={newPassword} />
            </label>
            <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
              Confirm password
              <div className="relative mt-1.5">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="pl-10"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1.5 text-xs font-medium text-red-500">Passwords do not match</p>
              )}
            </label>
          </>
        )}

        {status === "done" && (
          <Alert type="success">
            {mode === "request"
              ? "If the email exists, a reset link has been sent."
              : "Password updated successfully. You can now sign in."}
          </Alert>
        )}
        {status === "error" && (
          <Alert type="error">
            {mode === "request"
              ? "Could not request reset. Please try again."
              : mode === "confirm" && newPassword !== confirmPassword
                ? "Passwords do not match."
                : "Reset token is invalid or expired."}
          </Alert>
        )}

        <PrimaryButton type="submit" loading={loading}>
          {mode === "request" ? "Send reset email" : "Reset password"}
          <ArrowRight size={16} />
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}

/* ════════════════════════════════════════════════
   ACCEPT INVITE PAGE
   ════════════════════════════════════════════════ */
export function AcceptInvitePage(): JSX.Element {
  const { token = "" } = useParams();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"" | "done" | "error">("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      await api.post("/auth/invite/accept", { token, password, full_name: fullName || undefined });
      setStatus("done");
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      footer={
        <p className="text-center text-sm text-navy-400 dark:text-navy-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition">
            Sign in
          </Link>
        </p>
      }
    >
      <AuthHeading
        title="Accept invitation"
        subtitle="Set up your profile to join the workspace."
      />

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {/* Full name */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          Full name
          <div className="relative mt-1.5">
            <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <StyledInput
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="pl-10"
            />
          </div>
        </label>

        {/* Password */}
        <label className="block text-sm font-semibold text-navy-600 dark:text-navy-300">
          New password
          <div className="relative mt-1.5">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="pl-10"
            />
          </div>
          <PasswordStrength password={password} />
        </label>

        {status === "done" && (
          <Alert type="success">
            Account activated! Redirecting you to sign in...
          </Alert>
        )}
        {status === "error" && (
          <Alert type="error">
            Invite is invalid or expired. Please request a new one.
          </Alert>
        )}

        <PrimaryButton type="submit" loading={loading}>
          Accept &amp; Sign in
          <ArrowRight size={16} />
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}

/* ════════════════════════════════════════════════
   OAUTH CALLBACK PAGE
   ════════════════════════════════════════════════ */
export function OauthCallbackPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = searchParams.get("access_token");
  const refreshTokenValue = searchParams.get("refresh_token");
  const setAuth = useAuthStore.setState;

  if (accessToken && refreshTokenValue) {
    setAuth({ accessToken, refreshTokenValue });
    api
      .get("/auth/me")
      .then((res) => {
        setAuth({ user: res.data.user });
        navigate("/inbox", { replace: true });
      })
      .catch(() => navigate("/login", { replace: true }));
  } else if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.07),transparent_40%),linear-gradient(175deg,#F8FAFC_0%,#F1F5F9_50%,#EEF2FF_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.10),transparent_40%),linear-gradient(175deg,#0F172A_0%,#1E293B_50%,#0F172A_100%)]">
      <div className="auth-fade-in flex flex-col items-center gap-4 text-center">
        {/* Spinning brand ring */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-navy-200 dark:border-navy-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#4F46E5]" />
        </div>
        <div>
          <p className="font-display text-base font-semibold text-navy-700 dark:text-white">
            Signing you in...
          </p>
          <p className="mt-1 text-sm text-navy-400 dark:text-navy-400">
            This will only take a moment.
          </p>
        </div>
      </div>
      <style>{FADE_IN_STYLE}</style>
    </main>
  );
}
