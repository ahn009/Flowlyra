def test_chat_schema_imports():
    from app.schemas.chat import ChatUpdate

    assert ChatUpdate(status="waiting").status == "waiting"
