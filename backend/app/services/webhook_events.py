"""Canonical webhook event identifiers."""

CHAT_STARTED = "chat.started"
CHAT_MESSAGE_NEW = "chat.message.new"
CHAT_RESOLVED = "chat.resolved"
CHAT_TRANSFERRED = "chat.transferred"
CHAT_TAGGED = "chat.tagged"
CHAT_RATED = "chat.rated"

MESSAGE_SENT = "message.sent"
MESSAGE_UPDATED = "message.updated"
MESSAGE_DELETED = "message.deleted"

VISITOR_IDENTIFIED = "visitor.identified"
VISITOR_BANNED = "visitor.banned"
VISITOR_UNBANNED = "visitor.unbanned"

CONTACT_CREATED = "contact.created"
CONTACT_UPDATED = "contact.updated"
CONTACT_DELETED = "contact.deleted"

TICKET_CREATED = "ticket.created"
TICKET_UPDATED = "ticket.updated"
TICKET_RESOLVED = "ticket.resolved"
TICKET_COMMENTED = "ticket.commented"
TICKET_SLA_BREACHED = "ticket.sla_breached"

AGENT_ONLINE = "agent.online"
AGENT_OFFLINE = "agent.offline"
AGENT_STATUS_CHANGED = "agent.status_changed"

GOAL_ACHIEVED = "goal.achieved"
CAMPAIGN_SENT = "campaign.sent"
CAMPAIGN_CONVERTED = "campaign.converted"

BOT_STARTED = "bot.started"
BOT_HANDOFF = "bot.handoff"
BOT_COMPLETED = "bot.completed"

FILE_UPLOADED = "file.uploaded"
FORM_SUBMITTED = "form.submitted"
RATING_SUBMITTED = "rating.submitted"

INTEGRATION_INSTALLED = "integration.installed"
INTEGRATION_UNINSTALLED = "integration.uninstalled"
INTEGRATION_ERROR = "integration.error"

SUBSCRIPTION_CREATED = "subscription.created"
SUBSCRIPTION_UPDATED = "subscription.updated"
SUBSCRIPTION_CANCELED = "subscription.canceled"
INVOICE_PAID = "invoice.paid"
INVOICE_FAILED = "invoice.failed"

AUDIT_EVENT = "audit.event"

ALL_EVENTS = sorted(
    v for k, v in dict(globals()).items() if isinstance(v, str) and "." in v and not k.startswith("_")
)
