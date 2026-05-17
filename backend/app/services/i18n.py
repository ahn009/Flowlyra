"""Minimal i18n backend stub.

Provides ``translate(key, locale)`` looking up message catalogs by locale.
Catalogs live in this module as dicts; future versions can load from disk or
Crowdin export. Falls back to ``en`` for unknown locales/keys.
"""

from __future__ import annotations

CATALOGS: dict[str, dict[str, str]] = {
    "en": {
        "widget.greeting.default": "Hi! How can we help you today?",
        "widget.offline.title": "We're offline right now",
        "widget.offline.body": "Leave a message and we'll get back to you.",
        "widget.send_button": "Send",
        "widget.prechat.name": "Your name",
        "widget.prechat.email": "Your email",
        "widget.prechat.message": "How can we help?",
        "widget.rating.thanks": "Thanks for the feedback!",
        "email.invite.cta": "Accept invite",
    },
    "es": {
        "widget.greeting.default": "¡Hola! ¿Cómo podemos ayudarte hoy?",
        "widget.offline.title": "Estamos sin conexión",
        "widget.offline.body": "Deja un mensaje y te responderemos.",
        "widget.send_button": "Enviar",
        "widget.prechat.name": "Tu nombre",
        "widget.prechat.email": "Tu correo",
        "widget.prechat.message": "¿Cómo podemos ayudar?",
        "widget.rating.thanks": "¡Gracias por tu opinión!",
        "email.invite.cta": "Aceptar invitación",
    },
    "fr": {
        "widget.greeting.default": "Bonjour ! Comment pouvons-nous vous aider ?",
        "widget.offline.title": "Nous sommes hors ligne",
        "widget.offline.body": "Laissez un message, nous vous répondrons.",
        "widget.send_button": "Envoyer",
    },
    "de": {
        "widget.greeting.default": "Hallo! Wie können wir helfen?",
        "widget.offline.title": "Wir sind offline",
        "widget.offline.body": "Hinterlassen Sie eine Nachricht.",
        "widget.send_button": "Senden",
    },
    "pt": {
        "widget.greeting.default": "Olá! Como podemos ajudar?",
        "widget.offline.title": "Estamos offline",
        "widget.send_button": "Enviar",
    },
}


SUPPORTED_LOCALES = list(CATALOGS.keys())


def translate(key: str, locale: str | None = "en") -> str:
    locale_code = (locale or "en").split("-")[0].lower()
    catalog = CATALOGS.get(locale_code) or CATALOGS["en"]
    return catalog.get(key) or CATALOGS["en"].get(key) or key


def catalog_for(locale: str | None) -> dict[str, str]:
    code = (locale or "en").split("-")[0].lower()
    return CATALOGS.get(code, CATALOGS["en"]).copy()
