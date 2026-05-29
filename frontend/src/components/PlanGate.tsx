import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../lib/me";

const PLAN_ORDER = ["starter", "team", "business", "enterprise"] as const;
type PlanName = (typeof PLAN_ORDER)[number];

const FEATURE_REQUIREMENTS: Record<string, { plan: PlanName; label: string }> = {
  ai_copilot: { plan: "team", label: "AI Copilot" },
  advanced_reports: { plan: "business", label: "Advanced reports" },
  white_label: { plan: "business", label: "White label" },
  sso: { plan: "enterprise", label: "Single sign-on" },
  sso_config: { plan: "enterprise", label: "Single sign-on" },
  automation: { plan: "team", label: "Automation" },
};

function planRank(plan?: string | null) {
  const index = PLAN_ORDER.indexOf((plan || "starter") as PlanName);
  return index === -1 ? 0 : index;
}

interface PlanGateProps {
  feature: keyof typeof FEATURE_REQUIREMENTS | string;
  children: ReactNode;
  currentPlan?: string | null;
  fallback?: ReactNode;
}

export function PlanGate({ feature, children, currentPlan, fallback }: PlanGateProps) {
  const { data: me } = useMe();
  const user = me?.user as ({ organization_plan?: string; plan?: string } | undefined);
  const requirement = FEATURE_REQUIREMENTS[feature] ?? { plan: "business" as PlanName, label: feature.replace(/_/g, " ") };
  const activePlan = currentPlan || me?.organization?.plan || user?.organization_plan || user?.plan || "starter";
  const allowed = planRank(activePlan) >= planRank(requirement.plan);

  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-slate-900">
      <p className="text-sm font-semibold text-amber-900">Upgrade required</p>
      <h3 className="mt-1 text-lg font-bold">Unlock {requirement.label}</h3>
      <p className="mt-2 text-sm text-amber-900/80">
        Upgrade to the {requirement.plan} plan to use this feature in FlowLyra.
      </p>
      <Link
        to="/admin/billing"
        className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Upgrade plan
      </Link>
    </div>
  );
}
