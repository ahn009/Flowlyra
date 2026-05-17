from app.schemas.admin import ChatWidgetCreate, OrgUpdate


def test_org_update_phase1_widget_fields_are_accepted():
    payload = OrgUpdate(
        widget_custom_js="console.log('ok')",
        widget_greetings={"items": ["Hi", "Hello"]},
        widget_eye_catcher={"enabled": True, "text": "Need help?"},
        widget_white_label=True,
        widget_brand_text="Acme",
        widget_brand_url="https://acme.test",
        widget_sound_enabled=False,
        widget_lazy_load=True,
        widget_allow_attachments=False,
        widget_max_upload_mb=25,
        widget_default_locale="en",
        widget_supported_locales={"locales": ["en", "es"]},
    )
    data = payload.model_dump(exclude_unset=True)
    assert data["widget_white_label"] is True
    assert data["widget_max_upload_mb"] == 25
    assert data["widget_supported_locales"]["locales"] == ["en", "es"]


def test_chat_widget_slug_validation():
    ok = ChatWidgetCreate(slug="home-widget", name="Home", config={"color": "#1E40AF"})
    assert ok.slug == "home-widget"
