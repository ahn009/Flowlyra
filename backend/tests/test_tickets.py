def test_ticket_schema_imports():
    from app.schemas.ticket import TicketCreate

    assert TicketCreate(subject="Need help").priority == "medium"
