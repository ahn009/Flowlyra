from pydantic import BaseModel


class OverviewResponse(BaseModel):
    active_chats: int
    queue_length: int
    agents_online: int
    avg_wait_seconds: float
    todays_resolved: int
    todays_csat: float | None
