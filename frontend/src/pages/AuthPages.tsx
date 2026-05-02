import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button, Card, Field, TextInput } from "../components/ui";

export function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("admin@chatflow.dev");
  const [password, setPassword] = useState("Dev@12345");
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
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    await api.post("/auth/invite/accept", { token, password });
  }
  return (
    <AuthShell title="Accept invite">
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        <Field label="New password"><TextInput type="password" placeholder="New password" onChange={(event) => setPassword(event.target.value)} value={password} /></Field>
        <Button variant="primary" type="submit" className="w-full">Activate account</Button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    await api.post("/auth/password/reset", { email });
  }
  return (
    <AuthShell title="Reset password">
      <form onSubmit={(event) => void submit(event)} className="grid gap-4">
        <Field label="Email"><TextInput type="email" placeholder="Email" onChange={(event) => setEmail(event.target.value)} value={email} /></Field>
        <Button variant="primary" type="submit" className="w-full">Send reset email</Button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(#f8fafc,#eef3f8)] p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary font-black text-white">CF</span>
          <div>
            <h1 className="text-xl font-black text-slate-950">ChatFlow</h1>
            <p className="text-xs font-semibold text-slate-500">Human-first support</p>
          </div>
        </div>
        <h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2>
        {children}
      </Card>
    </main>
  );
}
