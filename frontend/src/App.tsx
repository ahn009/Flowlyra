import { lazy, Suspense, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useI18n } from "./i18n/I18nProvider";
import { registerNotificationSoundUnlock } from "./lib/notificationSound";
import { useAuthStore } from "./stores/authStore";

function lazyNamed(loader: () => Promise<Record<string, unknown>>, key: string) {
  return lazy(async () => ({ default: (await loader())[key] as ComponentType<object> }));
}

const AgentLayout = lazyNamed(() => import("./components/AgentLayout"), "AgentLayout");
const WorkspaceHomePage = lazyNamed(() => import("./pages/WorkspaceHomePage"), "WorkspaceHomePage");
const ArchivesPage = lazyNamed(() => import("./pages/ArchivesPage"), "ArchivesPage");
const AcceptInvitePage = lazyNamed(() => import("./pages/AuthPages"), "AcceptInvitePage");
const LoginPage = lazyNamed(() => import("./pages/AuthPages"), "LoginPage");
const OauthCallbackPage = lazyNamed(() => import("./pages/AuthPages"), "OauthCallbackPage");
const ResetPasswordPage = lazyNamed(() => import("./pages/AuthPages"), "ResetPasswordPage");
const ChatPage = lazyNamed(() => import("./pages/ChatPage"), "ChatPage");
const PublicChatPage = lazyNamed(() => import("./pages/PublicChatPage"), "PublicChatPage");
const ContactsPage = lazyNamed(() => import("./pages/ContactsPage"), "ContactsPage");
const InboxPage = lazyNamed(() => import("./pages/InboxPage"), "InboxPage");
const TicketDetailPage = lazyNamed(() => import("./pages/TicketsPage"), "TicketDetailPage");
const TicketsPage = lazyNamed(() => import("./pages/TicketsPage"), "TicketsPage");
const AgentsPage = lazyNamed(() => import("./pages/AdminPages"), "AgentsPage");
const AnalyticsPage = lazyNamed(() => import("./pages/AnalyticsDashboardPage"), "AnalyticsPage");
const BillingPage = lazyNamed(() => import("./pages/AdminPages"), "BillingPage");
const CannedResponsesPage = lazyNamed(() => import("./pages/AdminPages"), "CannedResponsesPage");
const InstallPage = lazyNamed(() => import("./pages/AdminPages"), "InstallPage");
const RoutingRulesPage = lazyNamed(() => import("./pages/AdminPages"), "RoutingRulesPage");
const TeamsPage = lazyNamed(() => import("./pages/AdminPages"), "TeamsPage");
const TriggersPage = lazyNamed(() => import("./pages/AdminPages"), "TriggersPage");
const WidgetConfigPage = lazyNamed(() => import("./pages/AdminPages"), "WidgetConfigPage");
const AuditLogsPage = lazyNamed(() => import("./pages/AuditLogsPage"), "AuditLogsPage");
const SecurityPage = lazyNamed(() => import("./pages/SecurityPage"), "SecurityPage");
const NotificationPreferencesPage = lazyNamed(() => import("./pages/NotificationPreferencesPage"), "NotificationPreferencesPage");
const SettingsOverviewPage = lazyNamed(() => import("./pages/SettingsOverviewPage"), "SettingsOverviewPage");
const TagsPage = lazyNamed(() => import("./pages/TagsPage"), "TagsPage");
const KnowledgeBasePage = lazyNamed(() => import("./pages/KnowledgeBasePage"), "KnowledgeBasePage");
const ChatbotPage = lazyNamed(() => import("./pages/ChatbotPage"), "ChatbotPage");
const KnowledgeSourcesPage = lazyNamed(() => import("./pages/KnowledgeSourcesPage"), "KnowledgeSourcesPage");
const ChannelsPage = lazyNamed(() => import("./pages/ChannelsPage"), "ChannelsPage");
const EngageCampaignsPage = lazyNamed(() => import("./pages/EngagePages"), "EngageCampaignsPage");
const EngageGoalsPage = lazyNamed(() => import("./pages/EngagePages"), "EngageGoalsPage");
const EngageTrafficPage = lazyNamed(() => import("./pages/EngagePages"), "EngageTrafficPage");
const PublicKBArticlePage = lazyNamed(() => import("./pages/PublicKBPage"), "PublicKBArticlePage");
const PublicKBIndexPage = lazyNamed(() => import("./pages/PublicKBPage"), "PublicKBIndexPage");
const WebhooksPage = lazyNamed(() => import("./pages/WebhooksPage"), "WebhooksPage");
const ApiKeysPage = lazyNamed(() => import("./pages/ApiKeysPage"), "ApiKeysPage");
const ApiChangelogPage = lazyNamed(() => import("./pages/ApiPlatformPages"), "ApiChangelogPage");
const ApiDocsPage = lazyNamed(() => import("./pages/ApiPlatformPages"), "ApiDocsPage");
const ApiStatusPage = lazyNamed(() => import("./pages/ApiPlatformPages"), "ApiStatusPage");
const IntegrationsMarketplacePage = lazyNamed(() => import("./pages/IntegrationsMarketplacePage"), "IntegrationsMarketplacePage");
const BlogPage = lazyNamed(() => import("./pages/PublicPages"), "BlogPage");
const BlogPostPage = lazyNamed(() => import("./pages/PublicPages"), "BlogPostPage");
const ContactPage = lazyNamed(() => import("./pages/UtilityPages"), "ContactPage");
const CustomersPage = lazyNamed(() => import("./pages/MarketingSubPages"), "CustomersPage");
const FeaturesPage = lazyNamed(() => import("./pages/MarketingSubPages"), "FeaturesPage");
const HelpPage = lazyNamed(() => import("./pages/UtilityPages"), "HelpPage");
const HomePage = lazyNamed(() => import("./pages/PublicPages"), "HomePage");
const IntegrationsPage = lazyNamed(() => import("./pages/MarketingSubPages"), "IntegrationsPage");
const NotFoundPage = lazyNamed(() => import("./pages/PublicPages"), "NotFoundPage");
const PricingPage = lazyNamed(() => import("./pages/PublicPages"), "PricingPage");
const PrivacyPage = lazyNamed(() => import("./pages/UtilityPages"), "PrivacyPage");
const ProductTourPage = lazyNamed(() => import("./pages/UtilityPages"), "ProductTourPage");
const SignupPage = lazyNamed(() => import("./pages/UtilityPages"), "SignupPage");
const SolutionEnterprisePage = lazyNamed(() => import("./pages/PublicPages"), "SolutionEnterprisePage");
const SolutionSalesPage = lazyNamed(() => import("./pages/MarketingSubPages"), "SolutionSalesPage");
const SolutionSupportPage = lazyNamed(() => import("./pages/MarketingSubPages"), "SolutionSupportPage");
const StatusPage = lazyNamed(() => import("./pages/UtilityPages"), "StatusPage");
const TermsPage = lazyNamed(() => import("./pages/UtilityPages"), "TermsPage");
const Phase15OpsPage = lazyNamed(() => import("./pages/Phase15OpsPage"), "Phase15OpsPage");
const DeveloperPortalPage = lazyNamed(() => import("./pages/DeveloperPortalPage"), "DeveloperPortalPage");
const CompliancePage = lazyNamed(() => import("./pages/CompliancePage"), "CompliancePage");
const SupervisionPage = lazyNamed(() => import("./pages/SupervisionPage"), "SupervisionPage");
const BenchmarkPage = lazyNamed(() => import("./pages/GapsPage"), "BenchmarkPage");
const ChatAvailabilityPage = lazyNamed(() => import("./pages/GapsPage"), "ChatAvailabilityPage");
const GreetingsConversionPage = lazyNamed(() => import("./pages/GapsPage"), "GreetingsConversionPage");
const MomentsPage = lazyNamed(() => import("./pages/GapsPage"), "MomentsPage");
const VoiceVideoPage = lazyNamed(() => import("./pages/GapsPage"), "VoiceVideoPage");

function ScreenFallback(): JSX.Element {
  return <div className="grid min-h-[40vh] place-items-center text-sm font-semibold text-navy-400">Loading...</div>;
}

function AuthGuard(): JSX.Element {
  const { t } = useI18n();
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

  if (!checked) return <div className="grid min-h-screen place-items-center bg-white text-sm font-medium text-navy-400 dark:bg-navy-900">{t("auth.checkingSession")}</div>;
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  return <AgentLayout />;
}

export function App(): JSX.Element {
  useEffect(() => {
    registerNotificationSoundUnlock();
  }, []);

  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/solutions/customer-support" element={<SolutionSupportPage />} />
        <Route path="/solutions/sales-marketing" element={<SolutionSalesPage />} />
        <Route path="/solutions/enterprise" element={<SolutionEnterprisePage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/product-tour" element={<ProductTourPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<CompliancePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<OauthCallbackPage />} />
        <Route path="/chat/:wsId" element={<PublicChatPage />} />
        <Route path="/api-docs" element={<ApiDocsPage />} />
        <Route path="/api-changelog" element={<ApiChangelogPage />} />
        <Route path="/api-status" element={<ApiStatusPage />} />
        <Route path="/kb/:orgSlug" element={<PublicKBIndexPage />} />
        <Route path="/kb/:orgSlug/:slug" element={<PublicKBArticlePage />} />
        <Route element={<AuthGuard />}>
          <Route path="/app" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<WorkspaceHomePage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/archives" element={<ArchivesPage />} />
          <Route path="/inbox/chat/:id" element={<ChatPage />} />
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
          <Route path="/admin/kb" element={<KnowledgeBasePage />} />
          <Route path="/admin/chatbot" element={<ChatbotPage />} />
          <Route path="/admin/ai-knowledge" element={<KnowledgeSourcesPage />} />
          <Route path="/admin/channels" element={<ChannelsPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/polish" element={<Phase15OpsPage />} />
          <Route path="/engage/traffic" element={<EngageTrafficPage />} />
          <Route path="/engage/campaigns" element={<EngageCampaignsPage />} />
          <Route path="/engage/campaigns/new" element={<EngageCampaignsPage />} />
          <Route path="/engage/goals" element={<EngageGoalsPage />} />
          <Route path="/admin/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsOverviewPage />} />
          <Route path="/settings/audit" element={<AuditLogsPage />} />
          <Route path="/settings/security" element={<SecurityPage />} />
          <Route path="/settings/webhooks" element={<WebhooksPage />} />
          <Route path="/settings/api" element={<ApiKeysPage />} />
          <Route path="/settings/integrations" element={<IntegrationsMarketplacePage />} />
          <Route path="/settings/tags" element={<TagsPage />} />
          <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
          <Route path="/admin/benchmark" element={<BenchmarkPage />} />
          <Route path="/admin/availability" element={<ChatAvailabilityPage />} />
          <Route path="/admin/greetings-conversion" element={<GreetingsConversionPage />} />
          <Route path="/admin/moments" element={<MomentsPage />} />
          <Route path="/settings/voice-video" element={<VoiceVideoPage />} />
          <Route path="/developer" element={<DeveloperPortalPage />} />
          <Route path="/supervision" element={<SupervisionPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
