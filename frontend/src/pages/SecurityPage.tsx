import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { api } from "../lib/api";
import { useMe, hasPermission } from "../lib/me";

interface SessionRow {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  created_at: string | null;
  last_used_at: string | null;
  is_current: boolean;
}

interface ScimTokenRow {
  id: string;
  label: string;
  token_prefix: string;
  created_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface VisitorBanRow {
  id: string;
  ban_type: string;
  value: string;
  reason: string | null;
  created_at: string | null;
}

interface RetentionState {
  configured: boolean;
  chat_days: number;
  ticket_days: number;
  audit_days: number;
  session_days: number;
  enabled: boolean;
}

interface SsoState {
  configured: boolean;
  is_active?: boolean;
  idp_entity_id?: string | null;
  idp_sso_url?: string | null;
  idp_slo_url?: string | null;
  idp_cert?: string | null;
  default_role?: string;
  auto_provision?: boolean;
  require_sso?: boolean;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function TwoFactorPanel() {
  const queryClient = useQueryClient();
  const me = useMe();
  const enrolled = me.data?.user?.two_factor_enabled ?? false;
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string; qr_data_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");

  const startSetup = useMutation({
    mutationFn: async () => (await api.post("/auth/2fa/setup")).data,
    onSuccess: (data) => setSetup(data),
    onError: () => toast.error("Could not start 2FA setup")
  });

  const verifySetup = useMutation({
    mutationFn: async () => (await api.post<{ codes: string[] }>("/auth/2fa/verify", { code })).data,
    onSuccess: async (data) => {
      setBackupCodes(data.codes);
      setSetup(null);
      setCode("");
      toast.success("2FA enabled");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error("Invalid code")
  });

  const regenerateCodes = useMutation({
    mutationFn: async () => (await api.post<{ codes: string[] }>("/auth/2fa/regenerate-backup-codes")).data,
    onSuccess: (data) => {
      setBackupCodes(data.codes);
      toast.success("Backup codes regenerated");
    }
  });

  const disable = useMutation({
    mutationFn: async () =>
      (await api.post("/auth/2fa/disable", { password: disablePassword, code: code || undefined })).data,
    onSuccess: async () => {
      setDisablePassword("");
      setCode("");
      setBackupCodes(null);
      toast.success("2FA disabled");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error("Disable failed")
  });

  return (
    <Section title="Two-factor authentication" description="Protects sign-in with a TOTP authenticator app.">
      {!enrolled && !setup && (
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => startSetup.mutate()}
          disabled={startSetup.isPending}
        >
          {startSetup.isPending ? "Generating…" : "Enable 2FA"}
        </button>
      )}

      {setup && (
        <div className="space-y-3">
          <img src={setup.qr_data_uri} alt="2FA QR" className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2" />
          <p className="text-xs text-slate-500">Secret: <code className="rounded bg-slate-100 px-1 py-0.5">{setup.secret}</code></p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            className="w-40 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            className="ml-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => verifySetup.mutate()}
            disabled={verifySetup.isPending || code.length < 6}
          >
            Verify & enable
          </button>
        </div>
      )}

      {backupCodes && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-900">Backup codes — save these now. They will not be shown again.</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm text-amber-900 sm:grid-cols-3">
            {backupCodes.map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>
      )}

      {enrolled && (
        <div className="mt-5 space-y-3">
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            onClick={() => regenerateCodes.mutate()}
            disabled={regenerateCodes.isPending}
          >
            {regenerateCodes.isPending ? "Generating…" : "Regenerate backup codes"}
          </button>
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Password"
              className="w-44 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="2FA code (optional)"
              className="w-44 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => disable.mutate()}
              disabled={!disablePassword || disable.isPending}
            >
              Disable 2FA
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function SessionsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["security-sessions"],
    queryFn: async () => (await api.get<{ items: SessionRow[] }>("/security/sessions")).data
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => api.post(`/security/sessions/${id}/revoke`),
    onSuccess: async () => {
      toast.success("Session revoked");
      await queryClient.invalidateQueries({ queryKey: ["security-sessions"] });
    }
  });
  const revokeOthers = useMutation({
    mutationFn: async () => api.post("/security/sessions/revoke-others"),
    onSuccess: async (resp) => {
      toast.success(`Revoked ${(resp.data as { revoked: number }).revoked} other sessions`);
      await queryClient.invalidateQueries({ queryKey: ["security-sessions"] });
    }
  });
  return (
    <Section title="Active sessions" description="Sign out other browsers from this account.">
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      <div className="mb-3">
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          onClick={() => revokeOthers.mutate()}
        >
          Sign out all other sessions
        </button>
      </div>
      <ul className="divide-y divide-slate-100 text-sm">
        {(data?.items ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-800">
                {s.browser ?? "Unknown browser"} on {s.os ?? "unknown OS"} {s.is_current && <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">current</span>}
              </p>
              <p className="text-xs text-slate-500">{s.ip_address ?? "no ip"} · last used {s.last_used_at ? new Date(s.last_used_at).toLocaleString() : "—"}</p>
            </div>
            {!s.is_current && (
              <button className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600" onClick={() => revoke.mutate(s.id)}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function IpAllowlistPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["ip-allowlist"],
    queryFn: async () => (await api.get<{ enabled: boolean; cidrs: string[] }>("/security/ip-allowlist")).data
  });
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const update = useMutation({
    mutationFn: async () => {
      const cidrs = text.split("\n").map((s) => s.trim()).filter(Boolean);
      return api.put("/security/ip-allowlist", { enabled, cidrs });
    },
    onSuccess: async () => {
      toast.success("IP allowlist saved");
      await queryClient.invalidateQueries({ queryKey: ["ip-allowlist"] });
    },
    onError: () => toast.error("Save failed — check CIDR formatting")
  });
  return (
    <Section title="IP allowlist" description="Restrict admin login to specific networks.">
      <div className="mb-3 flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled || !!data?.enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        <span className="text-xs text-slate-500">Current: {data?.enabled ? "ON" : "off"}, {data?.cidrs?.length ?? 0} CIDRs</span>
      </div>
      <textarea
        defaultValue={(data?.cidrs ?? []).join("\n")}
        onChange={(e) => setText(e.target.value)}
        placeholder="One CIDR per line, e.g. 203.0.113.0/24"
        className="h-32 w-full rounded-md border border-slate-200 p-2 font-mono text-xs"
      />
      <button className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => update.mutate()}>
        Save allowlist
      </button>
    </Section>
  );
}

function SsoPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["sso-config"],
    queryFn: async () => (await api.get<SsoState>("/security/sso")).data
  });
  const [form, setForm] = useState<Partial<SsoState>>({});
  const save = useMutation({
    mutationFn: async () => api.put("/security/sso", { ...data, ...form, is_active: form.is_active ?? data?.is_active }),
    onSuccess: async () => {
      toast.success("SSO config saved");
      await queryClient.invalidateQueries({ queryKey: ["sso-config"] });
    },
    onError: () => toast.error("Save failed")
  });
  return (
    <Section title="SAML Single Sign-On" description="Connect your IdP to enable workspace SSO.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-xs font-medium text-slate-600">IdP Entity ID</span>
          <input
            defaultValue={data?.idp_entity_id ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, idp_entity_id: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-medium text-slate-600">IdP SSO URL</span>
          <input
            defaultValue={data?.idp_sso_url ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, idp_sso_url: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="block text-xs font-medium text-slate-600">IdP Certificate (PEM)</span>
          <textarea
            defaultValue={data?.idp_cert ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, idp_cert: e.target.value }))}
            className="mt-1 h-32 w-full rounded-md border border-slate-200 p-2 font-mono text-xs"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-medium text-slate-600">Default role for new users</span>
          <select
            defaultValue={data?.default_role ?? "agent"}
            onChange={(e) => setForm((f) => ({ ...f, default_role: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option>agent</option>
            <option>supervisor</option>
            <option>admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={data?.auto_provision ?? true}
            onChange={(e) => setForm((f) => ({ ...f, auto_provision: e.target.checked }))}
          />
          Auto-provision users on first login
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={data?.is_active ?? false}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Activate SSO
        </label>
      </div>
      <button className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => save.mutate()}>
        Save SSO settings
      </button>
    </Section>
  );
}

function ScimTokensPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["scim-tokens"],
    queryFn: async () => (await api.get<{ items: ScimTokenRow[] }>("/security/scim/tokens")).data
  });
  const [label, setLabel] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: async () => (await api.post<{ token: string }>("/security/scim/tokens", { label })).data,
    onSuccess: async (resp) => {
      setRevealed(resp.token);
      setLabel("");
      await queryClient.invalidateQueries({ queryKey: ["scim-tokens"] });
    }
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/security/scim/tokens/${id}`),
    onSuccess: async () => {
      toast.success("Token revoked");
      await queryClient.invalidateQueries({ queryKey: ["scim-tokens"] });
    }
  });
  return (
    <Section title="SCIM tokens" description="Issue bearer tokens for IdP-driven user provisioning.">
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Token label (e.g. Okta production)"
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => create.mutate()} disabled={!label}>
          Generate
        </button>
      </div>
      {revealed && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          One-time reveal: <code className="font-mono">{revealed}</code> — copy now.
        </div>
      )}
      <ul className="divide-y divide-slate-100 text-sm">
        {(data?.items ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between py-2">
            <span>
              <span className="font-medium">{t.label}</span> ·{" "}
              <span className="font-mono text-xs text-slate-500">{t.token_prefix}…</span>
              {t.revoked_at && <span className="ml-2 text-xs text-red-600">revoked</span>}
            </span>
            {!t.revoked_at && (
              <button className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => revoke.mutate(t.id)}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function VisitorBansPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["visitor-bans"],
    queryFn: async () => (await api.get<{ items: VisitorBanRow[] }>("/security/bans")).data
  });
  const [banType, setBanType] = useState("ip");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const create = useMutation({
    mutationFn: async () => api.post("/security/bans", { ban_type: banType, value, reason: reason || undefined }),
    onSuccess: async () => {
      setValue("");
      setReason("");
      toast.success("Ban added");
      await queryClient.invalidateQueries({ queryKey: ["visitor-bans"] });
    }
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/security/bans/${id}`),
    onSuccess: async () => {
      toast.success("Ban removed");
      await queryClient.invalidateQueries({ queryKey: ["visitor-bans"] });
    }
  });
  return (
    <Section title="Visitor bans" description="Block visitors by IP/CIDR/email or session.">
      <div className="mb-3 grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]">
        <select value={banType} onChange={(e) => setBanType(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-sm">
          <option value="ip">IP</option>
          <option value="cidr">CIDR</option>
          <option value="email">Email</option>
          <option value="session">Session</option>
        </select>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (optional)" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => create.mutate()} disabled={!value}>
          Add
        </button>
      </div>
      <ul className="divide-y divide-slate-100 text-sm">
        {(data?.items ?? []).map((b) => (
          <li key={b.id} className="flex items-center justify-between py-2">
            <span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs">{b.ban_type}</span>{" "}
              <span className="font-mono">{b.value}</span>
              {b.reason && <span className="ml-2 text-xs text-slate-500">— {b.reason}</span>}
            </span>
            <button className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => revoke.mutate(b.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RetentionPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["retention"],
    queryFn: async () => (await api.get<RetentionState>("/security/retention")).data
  });
  const [form, setForm] = useState<Partial<RetentionState>>({});
  const save = useMutation({
    mutationFn: async () =>
      api.put("/security/retention", {
        enabled: form.enabled ?? data?.enabled ?? false,
        chat_days: form.chat_days ?? data?.chat_days,
        ticket_days: form.ticket_days ?? data?.ticket_days,
        audit_days: form.audit_days ?? data?.audit_days,
        session_days: form.session_days ?? data?.session_days
      }),
    onSuccess: async () => {
      toast.success("Retention policy saved");
      await queryClient.invalidateQueries({ queryKey: ["retention"] });
    }
  });
  return (
    <Section title="Data retention" description="Automatically purge old data per these windows.">
      <div className="mb-3 flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={data?.enabled ?? false}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
          />
          Enforce retention
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {["chat_days", "ticket_days", "audit_days", "session_days"].map((field) => (
          <label key={field} className="text-sm">
            <span className="block text-xs font-medium text-slate-600">{field.replace("_", " ")}</span>
            <input
              type="number"
              min={1}
              defaultValue={(data as Record<string, number> | undefined)?.[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: parseInt(e.target.value || "0", 10) }))}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        ))}
      </div>
      <button className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => save.mutate()}>
        Save retention
      </button>
    </Section>
  );
}

export function SecurityPage(): JSX.Element {
  const me = useMe();
  const canManage = hasPermission(me.data?.permissions, "security.manage") || hasPermission(me.data?.permissions, "security.write");

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-sm text-slate-500">Manage authentication, sessions, and data protection for your workspace.</p>
      </header>

      <TwoFactorPanel />
      <SessionsPanel />

      {canManage && (
        <>
          <IpAllowlistPanel />
          <SsoPanel />
          <ScimTokensPanel />
          <VisitorBansPanel />
          <RetentionPanel />
        </>
      )}
    </div>
  );
}
