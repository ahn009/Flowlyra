"""Static plan-tier configuration.

Stored as a module-level dict so it does not require a DB row; org plan is the
key into this table. Edit here when introducing new gates.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class PlanLimits:
    plan: str
    seats: int
    monthly_chats: int
    contacts: int
    storage_mb: int
    canned_responses: int
    tags: int
    routing_rules: int
    triggers: int
    webhooks: int
    api_keys: int
    api_requests_per_min: int
    auth_requests_per_min: int
    knowledge_base_articles: int
    chatbots: int
    integrations: int
    features: frozenset[str] = field(default_factory=frozenset)


_UNL = 10_000_000_000  # treat as unlimited for now


PLANS: dict[str, PlanLimits] = {
    "starter": PlanLimits(
        plan="starter",
        seats=3,
        monthly_chats=1_000,
        contacts=5_000,
        storage_mb=1_024,
        canned_responses=50,
        tags=50,
        routing_rules=5,
        triggers=5,
        webhooks=2,
        api_keys=2,
        api_requests_per_min=120,
        auth_requests_per_min=10,
        knowledge_base_articles=50,
        chatbots=1,
        integrations=3,
        features=frozenset({"core", "widget", "tickets", "kb_basic"}),
    ),
    "team": PlanLimits(
        plan="team",
        seats=10,
        monthly_chats=10_000,
        contacts=50_000,
        storage_mb=10_240,
        canned_responses=500,
        tags=500,
        routing_rules=25,
        triggers=25,
        webhooks=10,
        api_keys=10,
        api_requests_per_min=300,
        auth_requests_per_min=20,
        knowledge_base_articles=500,
        chatbots=3,
        integrations=10,
        features=frozenset({"core", "widget", "tickets", "kb_basic", "ai_text", "campaigns", "multi_channel_basic"}),
    ),
    "business": PlanLimits(
        plan="business",
        seats=50,
        monthly_chats=100_000,
        contacts=500_000,
        storage_mb=51_200,
        canned_responses=5_000,
        tags=5_000,
        routing_rules=100,
        triggers=100,
        webhooks=50,
        api_keys=50,
        api_requests_per_min=1_000,
        auth_requests_per_min=30,
        knowledge_base_articles=5_000,
        chatbots=20,
        integrations=50,
        features=frozenset({
            "core", "widget", "tickets", "kb_full", "ai_text", "ai_copilot", "campaigns", "goals",
            "multi_channel_full", "chatbot_builder", "advanced_reports", "white_label_basic",
        }),
    ),
    "enterprise": PlanLimits(
        plan="enterprise",
        seats=_UNL,
        monthly_chats=_UNL,
        contacts=_UNL,
        storage_mb=_UNL,
        canned_responses=_UNL,
        tags=_UNL,
        routing_rules=_UNL,
        triggers=_UNL,
        webhooks=_UNL,
        api_keys=_UNL,
        api_requests_per_min=5_000,
        auth_requests_per_min=60,
        knowledge_base_articles=_UNL,
        chatbots=_UNL,
        integrations=_UNL,
        features=frozenset({
            "core", "widget", "tickets", "kb_full", "ai_text", "ai_copilot", "campaigns", "goals",
            "multi_channel_full", "chatbot_builder", "advanced_reports", "white_label_full",
            "sso_saml", "scim", "audit_export", "ip_allowlist", "data_export", "custom_domain",
            "encryption_at_rest", "priority_support",
        }),
    ),
}


PLAN_ORDER = ["starter", "team", "business", "enterprise"]


def get_plan(name: str) -> PlanLimits:
    return PLANS.get(name, PLANS["starter"])


def is_plan_at_least(actual: str, required: str) -> bool:
    if actual not in PLAN_ORDER or required not in PLAN_ORDER:
        return False
    return PLAN_ORDER.index(actual) >= PLAN_ORDER.index(required)
