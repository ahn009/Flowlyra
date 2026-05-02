import logging

import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, agents, analytics, auth, chats, contacts, tickets, upload, widget
from app.config import get_settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.socket_manager import sio

settings = get_settings()
logging.basicConfig(level=settings.log_level)


def create_fastapi_app() -> FastAPI:
    app = FastAPI(title="ChatFlow API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)

    @app.exception_handler(Exception)
    async def problem_details(request: Request, exc: Exception) -> JSONResponse:
        logging.exception("unhandled error path=%s", request.url.path)
        detail = str(exc)
        if settings.environment.lower() in {"production", "staging"}:
            detail = "An unexpected error occurred. Please contact support."
        return JSONResponse(
            status_code=500,
            media_type="application/problem+json",
            content={"type": "about:blank", "title": "Internal Server Error", "status": 500, "detail": detail},
        )

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True}

    for router in (auth.router, widget.router, chats.router, tickets.router, contacts.router, agents.router, admin.router, analytics.router, upload.router):
        app.include_router(router, prefix="/api/v1")
    return app


fastapi_app = create_fastapi_app()
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")
