def test_analytics_imports():
    from app.schemas.analytics import OverviewResponse

    assert OverviewResponse(active_chats=0, queue_length=0, agents_online=0, avg_wait_seconds=0, todays_resolved=0, todays_csat=None)
