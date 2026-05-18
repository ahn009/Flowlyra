from __future__ import annotations

INTEGRATION_CATALOG: list[dict] = [
    {"provider": "shopify", "name": "Shopify", "category": "ecommerce", "install_type": "oauth2", "priority": "P0", "capabilities": ["orders.sync", "customers.sync", "webhooks"]},
    {"provider": "woocommerce", "name": "WooCommerce", "category": "ecommerce", "install_type": "api_key", "priority": "P1", "capabilities": ["orders.sync", "customers.sync"]},
    {"provider": "bigcommerce", "name": "BigCommerce", "category": "ecommerce", "install_type": "oauth2", "priority": "P2", "capabilities": ["orders.sync", "customers.sync"]},
    {"provider": "magento", "name": "Magento", "category": "ecommerce", "install_type": "api_key", "priority": "P3", "capabilities": ["orders.sync", "customers.sync"]},
    {"provider": "slack", "name": "Slack", "category": "collaboration", "install_type": "oauth2", "priority": "P0", "capabilities": ["notifications", "actions"]},
    {"provider": "ms_teams", "name": "Microsoft Teams", "category": "collaboration", "install_type": "oauth2", "priority": "P1", "capabilities": ["notifications", "actions"]},
    {"provider": "salesforce", "name": "Salesforce", "category": "crm", "install_type": "oauth2", "priority": "P0", "capabilities": ["contacts.sync", "leads.sync"]},
    {"provider": "hubspot", "name": "HubSpot", "category": "crm", "install_type": "oauth2", "priority": "P0", "capabilities": ["contacts.sync", "deals.sync"]},
    {"provider": "pipedrive", "name": "Pipedrive", "category": "crm", "install_type": "oauth2", "priority": "P1", "capabilities": ["contacts.sync", "deals.sync"]},
    {"provider": "zoho_crm", "name": "Zoho CRM", "category": "crm", "install_type": "oauth2", "priority": "P2", "capabilities": ["contacts.sync", "leads.sync"]},
    {"provider": "mailchimp", "name": "Mailchimp", "category": "marketing", "install_type": "oauth2", "priority": "P1", "capabilities": ["audiences.sync", "campaigns.trigger"]},
    {"provider": "activecampaign", "name": "ActiveCampaign", "category": "marketing", "install_type": "api_key", "priority": "P2", "capabilities": ["contacts.sync", "campaigns.trigger"]},
    {"provider": "klaviyo", "name": "Klaviyo", "category": "marketing", "install_type": "api_key", "priority": "P2", "capabilities": ["profiles.sync", "events.push"]},
    {"provider": "ga4", "name": "Google Analytics 4", "category": "analytics", "install_type": "api_key", "priority": "P0", "capabilities": ["events.push"]},
    {"provider": "gtm", "name": "Google Tag Manager", "category": "analytics", "install_type": "script", "priority": "P1", "capabilities": ["datalayer.push"]},
    {"provider": "facebook_pixel", "name": "Facebook Pixel", "category": "analytics", "install_type": "script", "priority": "P1", "capabilities": ["events.push"]},
    {"provider": "zendesk", "name": "Zendesk", "category": "support", "install_type": "oauth2", "priority": "P1", "capabilities": ["tickets.sync"]},
    {"provider": "jira", "name": "Jira", "category": "support", "install_type": "oauth2", "priority": "P1", "capabilities": ["issues.create"]},
    {"provider": "github_issues", "name": "GitHub Issues", "category": "support", "install_type": "oauth2", "priority": "P2", "capabilities": ["issues.create"]},
    {"provider": "linear", "name": "Linear", "category": "support", "install_type": "oauth2", "priority": "P2", "capabilities": ["issues.create"]},
    {"provider": "zapier", "name": "Zapier", "category": "automation", "install_type": "webhook", "priority": "P0", "capabilities": ["triggers", "actions"]},
    {"provider": "make", "name": "Make.com", "category": "automation", "install_type": "webhook", "priority": "P1", "capabilities": ["triggers", "actions"]},
    {"provider": "n8n", "name": "n8n", "category": "automation", "install_type": "webhook", "priority": "P2", "capabilities": ["triggers", "actions"]},
    {"provider": "wordpress", "name": "WordPress", "category": "website", "install_type": "embed", "priority": "P0", "capabilities": ["widget.install"]},
    {"provider": "wix", "name": "Wix", "category": "website", "install_type": "embed", "priority": "P1", "capabilities": ["widget.install"]},
    {"provider": "squarespace", "name": "Squarespace", "category": "website", "install_type": "embed", "priority": "P2", "capabilities": ["widget.install"]},
    {"provider": "webflow", "name": "Webflow", "category": "website", "install_type": "embed", "priority": "P2", "capabilities": ["widget.install"]},
    {"provider": "calendly", "name": "Calendly", "category": "productivity", "install_type": "oauth2", "priority": "P1", "capabilities": ["booking.cards"]},
    {"provider": "google_calendar", "name": "Google Calendar", "category": "productivity", "install_type": "oauth2", "priority": "P2", "capabilities": ["events.create"]},
    {"provider": "zoom", "name": "Zoom", "category": "productivity", "install_type": "oauth2", "priority": "P2", "capabilities": ["meetings.create"]},
    {"provider": "google_drive", "name": "Google Drive", "category": "files", "install_type": "oauth2", "priority": "P2", "capabilities": ["files.pick"]},
    {"provider": "dropbox", "name": "Dropbox", "category": "files", "install_type": "oauth2", "priority": "P3", "capabilities": ["files.pick"]},
    {"provider": "stripe", "name": "Stripe", "category": "billing", "install_type": "api_key", "priority": "P0", "capabilities": ["customers.lookup"]},
    {"provider": "deepl", "name": "DeepL", "category": "translation", "install_type": "api_key", "priority": "P1", "capabilities": ["translate"]},
    {"provider": "google_translate", "name": "Google Translate", "category": "translation", "install_type": "api_key", "priority": "P1", "capabilities": ["translate"]},
]


def get_catalog() -> list[dict]:
    return INTEGRATION_CATALOG


def get_definition(provider: str) -> dict | None:
    p = provider.strip().lower()
    for item in INTEGRATION_CATALOG:
        if item["provider"] == p:
            return item
    return None


def automation_specs() -> dict:
    triggers = [
        {"key": "chat.started", "label": "Chat started"},
        {"key": "chat.message.new", "label": "Chat message"},
        {"key": "ticket.created", "label": "Ticket created"},
        {"key": "goal.achieved", "label": "Goal achieved"},
        {"key": "contact.updated", "label": "Contact updated"},
    ]
    actions = [
        {"key": "ticket.create", "label": "Create ticket"},
        {"key": "contact.upsert", "label": "Upsert contact"},
        {"key": "chat.reply", "label": "Reply to chat"},
        {"key": "tag.apply", "label": "Apply chat tag"},
    ]
    return {"triggers": triggers, "actions": actions}


def embed_guides() -> list[dict]:
    return [
        {"provider": "wordpress", "title": "WordPress", "steps": ["Install plugin", "Paste workspace slug", "Save and publish"]},
        {"provider": "wix", "title": "Wix", "steps": ["Add custom code", "Paste widget script", "Publish site"]},
        {"provider": "squarespace", "title": "Squarespace", "steps": ["Settings > Advanced > Code Injection", "Paste widget script", "Save"]},
        {"provider": "webflow", "title": "Webflow", "steps": ["Project settings > Custom code", "Paste widget snippet", "Publish"]},
    ]
