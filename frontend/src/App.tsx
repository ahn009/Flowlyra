import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { AgentLayout } from "./components/AgentLayout";
import { AcceptInvitePage, LoginPage, ResetPasswordPage } from "./pages/AuthPages";
import { ChatPage } from "./pages/ChatPage";
import { ContactsPage } from "./pages/ContactsPage";
import { InboxPage } from "./pages/InboxPage";
import { TicketDetailPage, TicketsPage } from "./pages/TicketsPage";
import { AgentsPage, AnalyticsPage, BillingPage, CannedResponsesPage, InstallPage, RoutingRulesPage, TeamsPage, TriggersPage, WidgetConfigPage } from "./pages/AdminPages";
import { useAuthStore } from "./stores/authStore";

function AuthGuard(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshTokenValue = useAuthStore((state) => state.refreshTokenValue);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const logout = useAuthStore((state) => state.logout);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    async function ensureToken(): Promise<void> {
      if (!user) {
        setChecked(true);
        return;
      }
      if (!refreshTokenValue) {
        await logout();
        if (alive) setChecked(true);
        return;
      }
      try {
        await refreshToken();
      } catch {
        await logout();
      } finally {
        if (alive) setChecked(true);
      }
    }
    void ensureToken();
    return () => {
      alive = false;
    };
  }, [logout, refreshToken, refreshTokenValue, user]);

  if (!checked) return <div className="grid min-h-screen place-items-center bg-surface text-sm font-semibold text-slate-500">Checking session...</div>;
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  return <AgentLayout />;
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/ticket/:id" element={<TicketDetailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/admin/agents" element={<AgentsPage />} />
        <Route path="/admin/teams" element={<TeamsPage />} />
        <Route path="/admin/widget" element={<WidgetConfigPage />} />
        <Route path="/admin/install" element={<InstallPage />} />
        <Route path="/admin/routing" element={<RoutingRulesPage />} />
        <Route path="/admin/triggers" element={<TriggersPage />} />
        <Route path="/admin/canned" element={<CannedResponsesPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/billing" element={<BillingPage />} />
      </Route>
    </Routes>
  );
}
