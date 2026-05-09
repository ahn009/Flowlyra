import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import flowlyraLogo from "../assets/flowlyra-logo.svg";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button, Card, Field, TextInput, ThemeToggle } from "../components/ui";

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  if (user) return <Navigate to="/inbox" replace />;
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/inbox");
    } catch {
      setError("Invalid email or password");
    }
  }
  return (
    <AuthShell title="Sign in">
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        <Field label="Email"><TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Password"><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <Button variant="primary" type="submit" className="w-full">Login</Button>
        <Link className="text-sm font-semibold text-primary hover:text-blue-800" to="/reset-password">Reset password</Link>
      </form>
    </AuthShell>
  );
}

export function AcceptInvitePage(): JSX.Element {
  const { token = "" } = useParams();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"" | "done" | "error">("");
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("");
    try {
      await api.post("/auth/invite/accept", { token, password, full_name: fullName || undefined });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }
  return (
    <AuthShell title="Accept invite">
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        <Field label="Full name"><TextInput placeholder="Your full name" onChange={(event) => setFullName(event.target.value)} value={fullName} /></Field>
        <Field label="New password"><TextInput type="password" placeholder="New password" onChange={(event) => setPassword(event.target.value)} value={password} /></Field>
        {status === "done" && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">Account activated. You can now log in.</p>}
        {status === "error" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Invite is invalid or expired.</p>}
        <Button variant="primary" type="submit" className="w-full">Activate account</Button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"request" | "confirm">(searchParams.get("token") ? "confirm" : "request");
  const [status, setStatus] = useState<"" | "done" | "error">("");

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("");
    try {
      if (mode === "request") {
        await api.post("/auth/password/reset", { email });
      } else {
        await api.post("/auth/password/reset/confirm", { token, password });
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }
  return (
    <AuthShell title="Reset password">
      <div className="mb-4 flex gap-2">
        <Button type="button" size="sm" variant={mode === "request" ? "primary" : "secondary"} onClick={() => setMode("request")}>Request reset</Button>
        <Button type="button" size="sm" variant={mode === "confirm" ? "primary" : "secondary"} onClick={() => setMode("confirm")}>Set new password</Button>
      </div>
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        {mode === "request" ? (
          <Field label="Email"><TextInput type="email" placeholder="Email" onChange={(event) => setEmail(event.target.value)} value={email} /></Field>
        ) : (
          <>
            <Field label="Reset token"><TextInput placeholder="Paste token" onChange={(event) => setToken(event.target.value)} value={token} /></Field>
            <Field label="New password"><TextInput type="password" placeholder="At least 8 characters" onChange={(event) => setPassword(event.target.value)} value={password} /></Field>
          </>
        )}
        {status === "done" && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{mode === "request" ? "If the email exists, a reset link has been sent." : "Password updated. You can now log in."}</p>}
        {status === "error" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{mode === "request" ? "Could not request reset." : "Reset token is invalid or expired."}</p>}
        <Button variant="primary" type="submit" className="w-full">{mode === "request" ? "Send reset email" : "Update password"}</Button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <main className="relative grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(#f8fafc,#eef3f8)] p-4 dark:bg-[radial-gradient(circle_at_top_left,#1e3a5f_0%,transparent_34%),linear-gradient(#0b1220,#0f182c)]">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6">
          <img src={flowlyraLogo} alt="FlowLyra logo" className="h-16 w-auto" />
          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">AI-powered support workflow platform</p>
        </div>
        <h2 className="mb-4 text-lg font-black text-ink">{title}</h2>
        {children}
      </Card>
    </main>
  );
}
