"""Channel adapter package — importing registers all adapters."""
from app.channels import (  # noqa: F401
    email_channel,
    messenger,
    other_channels,
    sms_twilio,
    telegram,
    whatsapp,
)
from app.channels.base import (  # noqa: F401
    ChannelAdapter,
    InboundMessage,
    OutboundResult,
    all_channels,
    get_adapter_class,
    register,
)
