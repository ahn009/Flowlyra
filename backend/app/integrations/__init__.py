from app.integrations.base import IntegrationProvider
from app.integrations.shopify import ShopifyProvider
from app.integrations.slack import SlackProvider
from app.integrations.hubspot import HubSpotProvider
from app.integrations.salesforce import SalesforceProvider
from app.integrations.google_analytics import GoogleAnalyticsProvider
from app.integrations.stripe_integration import StripeIntegrationProvider
from app.integrations.zapier import ZapierProvider

PROVIDERS = {
    cls.provider: cls for cls in [ShopifyProvider, SlackProvider, HubSpotProvider, SalesforceProvider, GoogleAnalyticsProvider, StripeIntegrationProvider, ZapierProvider]
}

__all__ = ["IntegrationProvider", "PROVIDERS"]
