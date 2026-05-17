def test_widget_schema_imports():
    from app.schemas.widget import WidgetInitRequest

    assert WidgetInitRequest(org_slug="test-org").org_slug == "test-org"


def test_widget_init_request_accepts_widget_slug():
    from app.schemas.widget import WidgetInitRequest

    payload = WidgetInitRequest(org_slug="test-org", widget_slug="homepage-main")
    assert payload.widget_slug == "homepage-main"
