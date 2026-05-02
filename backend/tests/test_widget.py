def test_widget_schema_imports():
    from app.schemas.widget import WidgetInitRequest

    assert WidgetInitRequest(org_slug="test-org").org_slug == "test-org"
