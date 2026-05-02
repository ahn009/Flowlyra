def test_routing_imports():
    from app.services.routing_service import choose_agent

    assert callable(choose_agent)
