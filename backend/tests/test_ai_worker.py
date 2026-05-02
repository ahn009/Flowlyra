def test_ai_worker_imports():
    from app.workers.ai_worker import get_agent_suggestions

    assert get_agent_suggestions.name == "app.workers.ai_worker.get_agent_suggestions"
