from datetime import UTC, datetime
import uuid

import socketio
from sqlalchemy import select

from app.config import get_settings
from app.db.redis import get_redis
from app.db.session import AsyncSessionLocal
from app.middleware.auth import verify_socket_token
from app.models.chat import Chat
from app.models.contact import Contact
from app.models.analytics_event import AnalyticsEvent
from app.models.message import Message
from app.models.session import Session
from app.models.user import User
from app.services.chat_service import add_message, get_chat, start_chat

settings = get_settings()
manager = socketio.AsyncRedisManager(settings.redis_url)
sio = socketio.AsyncServer(async_mode="asgi", client_manager=manager, cors_allowed_origins=settings.cors_origin_list)


async def emit_error(sid: str, message: str) -> None:
    await sio.emit("error", {"message": message}, to=sid)


def _to_uuid(value: object) -> uuid.UUID:
    return uuid.UUID(str(value))


async def _chat_for_session(db, session: dict, chat_id: uuid.UUID) -> Chat:
    if session.get("kind") == "agent":
        user = session.get("user") or {}
        return await get_chat(db, _to_uuid(user["organization_id"]), chat_id)
    if session.get("kind") == "widget":
        org_id = session.get("organization_id")
        if not org_id:
            raise ValueError("Widget session is not linked to an organization")
        chat = await get_chat(db, _to_uuid(org_id), chat_id)
        if session.get("chat_id") and session.get("chat_id") != str(chat.id):
            raise ValueError("Widget access denied for this chat")
        return chat
    raise ValueError("Unauthorized socket session")


async def emit_to_rooms(event: str, payload: dict, rooms: list[str]) -> None:
    """Emit an event to multiple rooms.

    Uses the standard ``sio.emit`` per room so that the
    ``AsyncRedisManager`` correctly publishes across all server
    processes.  The previous implementation manually iterated
    ``get_participants`` which only returns *local* sids and silently
    dropped messages destined for sids on other workers.
    """
    for room in rooms:
        await sio.emit(event, payload, room=room)


async def set_visitor_presence(chat: Chat, online: bool) -> None:
    redis = get_redis()
    key = f"presence:visitor:{chat.id}"
    if online:
        await redis.set(key, "online")
    else:
        await redis.delete(key)
    await sio.emit(
        "visitor:status:changed",
        {"chat_id": str(chat.id), "visitor_status": "online" if online else "offline"},
        room=f"org:{chat.organization_id}",
    )


async def set_ticket_presence(ticket_id: uuid.UUID, user_id: uuid.UUID, online: bool) -> int:
    redis = get_redis()
    key = f"presence:ticket:{ticket_id}:{user_id}"
    if online:
        await redis.setex(key, 90, "1")
    else:
        await redis.delete(key)
    cursor = b"0"
    count = 0
    while True:
        cursor, keys = await redis.scan(cursor=cursor, match=f"presence:ticket:{ticket_id}:*", count=500)
        count += len(keys)
        if cursor == 0 or cursor == b"0":
            break
    return count


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> bool:
    token = (auth or {}).get("token")
    if token:
        try:
            user = await verify_socket_token(token)
        except Exception:
            return False
        await sio.save_session(sid, {"kind": "agent", "user": user.model_dump(mode="json")})
        await sio.enter_room(sid, f"org:{user.organization_id}")
        await sio.enter_room(sid, f"agent:{user.id}")
        if user.role in {"admin", "supervisor"}:
            await sio.enter_room(sid, f"supervisor:{user.organization_id}")
    else:
        await sio.save_session(sid, {"kind": "widget"})
    return True


@sio.event
async def disconnect(sid: str) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") == "widget" and session.get("chat_id"):
        async with AsyncSessionLocal() as db:
            chat = (await db.execute(select(Chat).where(Chat.id == uuid.UUID(str(session["chat_id"]))))).scalar_one_or_none()
            if chat:
                await set_visitor_presence(chat, False)


@sio.on("chat:start")
async def chat_start(sid: str, data: dict) -> None:
    try:
        session = await sio.get_session(sid)
        if session.get("kind") != "widget":
            await emit_error(sid, "Only widget clients can start chats")
            return
        async with AsyncSessionLocal() as db:
            chat, message = await start_chat(
                db,
                uuid.UUID(str(data["organization_id"])),
                data["session_token"],
                data.get("subject"),
                data.get("message"),
                data.get("name"),
                data.get("email"),
                data.get("phone"),
                data.get("custom_fields"),
            )
            await sio.enter_room(sid, f"chat:{chat.id}")
            await sio.save_session(sid, {"kind": "widget", "chat_id": str(chat.id), "organization_id": str(chat.organization_id)})
            await set_visitor_presence(chat, True)
            payload = {"chat": await _chat_payload_with_contact(db, chat), "message": _message_payload(message) if message else None}
            await sio.emit("chat:started", payload, to=sid)
            await sio.emit("chat:new", payload, room=f"org:{chat.organization_id}")
            await sio.emit(
                "notification",
                {
                    "title": "New incoming chat",
                    "body": (message.content if message and message.content else chat.subject) or "A visitor started a chat",
                    "level": "info",
                    "chat_id": str(chat.id),
                },
                room=f"org:{chat.organization_id}",
            )
            if chat.assigned_user_id and message:
                from app.workers.ai_worker import get_agent_suggestions

                get_agent_suggestions.delay(str(chat.id), message.content or "", str(chat.organization_id))
    except Exception as exc:
        await emit_error(sid, str(exc))


@sio.on("chat:message")
async def chat_message(sid: str, data: dict) -> None:
    try:
        session = await sio.get_session(sid)
        async with AsyncSessionLocal() as db:
            chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
            if session.get("kind") == "agent":
                sender_type = "agent"
                sender_id = _to_uuid(session["user"]["id"])
                is_internal = bool(data.get("is_internal", False))
            elif session.get("kind") == "widget":
                sender_type = "customer"
                sender_id = chat.contact_id
                is_internal = False
            else:
                await emit_error(sid, "Unauthorized socket session")
                return
            message = await add_message(
                db,
                chat,
                sender_type,
                data.get("content"),
                sender_id,
                is_internal,
                data.get("content_type", "text"),
                data.get("file_url"),
                data.get("file_name"),
                data.get("file_size"),
                data.get("file_mime"),
            )
            await db.commit()
            if not message.is_internal:
                payload = _message_payload(message)
                if sender_type == "agent":
                    agent = (await db.execute(select(User).where(User.id == sender_id))).scalar_one_or_none()
                    if agent:
                        payload["metadata"] = {
                            "agent": {
                                "id": str(agent.id),
                                "name": agent.full_name or agent.email,
                                "avatar_url": agent.avatar_url,
                            }
                        }
                rooms = [f"chat:{chat.id}", f"org:{chat.organization_id}"]
                if chat.assigned_user_id:
                    rooms.append(f"agent:{chat.assigned_user_id}")
                await emit_to_rooms("chat:message:new", payload, rooms)
                if sender_type == "customer":
                    await sio.emit(
                        "notification",
                        {
                            "title": "New visitor message",
                            "body": (message.content or "Visitor sent a new message")[:180],
                            "level": "info",
                            "chat_id": str(chat.id),
                        },
                        room=f"org:{chat.organization_id}",
                    )
            elif chat.assigned_user_id:
                await sio.emit("chat:message:new", _message_payload(message), room=f"agent:{chat.assigned_user_id}")
            if sender_type == "customer" and chat.assigned_user_id:
                from app.workers.ai_worker import get_agent_suggestions

                get_agent_suggestions.delay(str(chat.id), message.content or "", str(chat.organization_id))
    except Exception as exc:
        await emit_error(sid, str(exc))


@sio.on("chat:typing:start")
async def typing_start(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
    user = session.get("user") if session.get("kind") == "agent" else None
    sender_type = "agent" if session.get("kind") == "agent" else "customer"
    await sio.emit(
        "chat:typing",
        {
            "chat_id": str(chat.id),
            "typing": True,
            "sender_type": sender_type,
            "agent_name": user.get("full_name") if user else None,
            "agent_avatar_url": user.get("avatar_url") if user else None,
        },
        room=f"chat:{chat.id}",
        skip_sid=sid,
    )


@sio.on("chat:typing:stop")
async def typing_stop(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
    user = session.get("user") if session.get("kind") == "agent" else None
    sender_type = "agent" if session.get("kind") == "agent" else "customer"
    await sio.emit(
        "chat:typing",
        {
            "chat_id": str(chat.id),
            "typing": False,
            "sender_type": sender_type,
            "agent_name": user.get("full_name") if user else None,
            "agent_avatar_url": user.get("avatar_url") if user else None,
        },
        room=f"chat:{chat.id}",
        skip_sid=sid,
    )


@sio.on("chat:typing:preview")
async def typing_preview(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") != "widget":
        await emit_error(sid, "Typing preview is widget-only")
        return
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
        if chat.assigned_user_id:
            await sio.emit("chat:typing:preview", {"chat_id": str(chat.id), "text": data.get("text", "")}, room=f"agent:{chat.assigned_user_id}")


@sio.on("agent:join:chat")
@sio.on("widget:join:chat")
async def join_chat(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    chat_id = _to_uuid(data["chat_id"])

    if session.get("kind") == "widget":
        # Widget sessions may not yet have organization_id (e.g. on
        # reconnect).  Look up the chat directly so we can populate
        # the session before any authorization check.
        async with AsyncSessionLocal() as db:
            chat = (
                await db.execute(select(Chat).where(Chat.id == chat_id))
            ).scalar_one_or_none()
            if chat is None:
                await emit_error(sid, "Chat not found")
                return
            # Persist org linkage so subsequent calls succeed.
            await sio.save_session(sid, {
                "kind": "widget",
                "chat_id": str(chat.id),
                "organization_id": str(chat.organization_id),
            })
        await sio.enter_room(sid, f"chat:{chat.id}")
        await set_visitor_presence(chat, True)
        return

    # Agent path
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, chat_id)
    await sio.enter_room(sid, f"chat:{chat.id}")


@sio.on("agent:leave:chat")
async def leave_chat(sid: str, data: dict) -> None:
    await sio.leave_room(sid, f"chat:{data.get('chat_id')}")


@sio.on("visitor:url:update")
async def visitor_url_update(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") != "widget":
        return
    chat_id_raw = data.get("chat_id") or session.get("chat_id")
    if not chat_id_raw:
        return
    try:
        chat_id = _to_uuid(chat_id_raw)
    except Exception:
        return
    url = str(data.get("url") or "").strip()
    if not url:
        return
    title = str(data.get("title") or "").strip() or None
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, chat_id)
        sess = (
            await db.execute(
                select(Session).where(Session.id == chat.session_id, Session.organization_id == chat.organization_id)
            )
        ).scalar_one_or_none()
        if sess is None:
            return
        sess.current_url = url
        sess.page_views = int(sess.page_views or 0) + 1
        history = list((sess.page_history or {}).get("items") or [])
        history.append({"url": url, "title": title, "ts": datetime.now(UTC).isoformat()})
        sess.page_history = {"items": history[-100:]}
        db.add(
            AnalyticsEvent(
                organization_id=chat.organization_id,
                event_type="page.view",
                contact_id=chat.contact_id,
                chat_id=chat.id,
                metadata_={"session_id": str(sess.id), "url": url, "title": title},
            )
        )
        await db.commit()
        await sio.emit(
            "visitor:page:view",
            {"chat_id": str(chat.id), "session_id": str(sess.id), "url": url, "title": title},
            room=f"org:{chat.organization_id}",
        )


@sio.on("agent:status")
async def agent_status(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    user = session.get("user")
    if user:
        await sio.emit("agent:status:changed", {"user_id": user["id"], "status": data.get("status")}, room=f"org:{user['organization_id']}")


@sio.on("chat:assign")
async def chat_assign(sid: str, data: dict) -> None:
    async with AsyncSessionLocal() as db:
        session = await sio.get_session(sid)
        if session.get("kind") != "agent":
            await emit_error(sid, "Only agents can assign chats")
            return
        user = session.get("user") or {}
        organization_id = _to_uuid(user["organization_id"])
        chat_id = _to_uuid(data["chat_id"])
        chat = (
            await db.execute(select(Chat).where(Chat.id == chat_id, Chat.organization_id == organization_id).with_for_update())
        ).scalar_one_or_none()
        if chat is None:
            await emit_error(sid, "Chat not found")
            return
        assigned_user_id = _to_uuid(data["assigned_user_id"])
        assignee = (
            await db.execute(
                select(User).where(User.id == assigned_user_id, User.organization_id == organization_id, User.is_active.is_(True))
            )
        ).scalar_one_or_none()
        if assignee is None:
            await emit_error(sid, "Target agent not found in this organization")
            return
        chat.assigned_user_id = assigned_user_id
        chat.status = "active"
        await db.commit()
        payload = {
            "chat_id": str(chat.id),
            "assigned_user_id": str(chat.assigned_user_id),
            "assigned": {
                "id": str(assignee.id),
                "name": assignee.full_name or assignee.email,
                "avatar_url": assignee.avatar_url,
            },
        }
        await sio.emit("chat:assigned", payload, room=f"agent:{chat.assigned_user_id}")
        await sio.emit("chat:assigned", payload, room=f"chat:{chat.id}")


@sio.on("chat:transfer")
async def chat_transfer(sid: str, data: dict) -> None:
    await chat_assign(sid, data)
    await sio.emit("chat:transferred", data, room=f"chat:{data.get('chat_id')}")


@sio.on("chat:resolve")
async def chat_resolve(sid: str, data: dict) -> None:
    async with AsyncSessionLocal() as db:
        session = await sio.get_session(sid)
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
        chat.status = "resolved"
        chat.resolved_at = datetime.now(UTC)
        await db.commit()
        await sio.emit("chat:resolved", {"chat_id": str(chat.id)}, room=f"chat:{chat.id}")


@sio.on("chat:read")
async def chat_read(sid: str, data: dict) -> None:
    async with AsyncSessionLocal() as db:
        session = await sio.get_session(sid)
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
        await db.execute(Message.__table__.update().where(Message.chat_id == chat.id).values(is_read=True))
        await db.commit()
    await sio.emit("chat:read", {"chat_id": str(chat.id)}, room=f"chat:{chat.id}", skip_sid=sid)


@sio.on("webrtc:signal")
async def webrtc_signal(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
    await sio.emit(
        "webrtc:signal",
        {
            "chat_id": str(chat.id),
            "signal": data.get("signal"),
            "mode": data.get("mode", "voice"),
            "from": "agent" if session.get("kind") == "agent" else "visitor",
        },
        room=f"chat:{chat.id}",
        skip_sid=sid,
    )


@sio.on("cobrowse:request")
async def cobrowse_request(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
    await sio.emit(
        "cobrowse:request",
        {
            "chat_id": str(chat.id),
            "from": "agent" if session.get("kind") == "agent" else "visitor",
            "mode": data.get("mode", "screen"),
        },
        room=f"chat:{chat.id}",
        skip_sid=sid,
    )


@sio.on("chat:csat")
async def chat_csat(sid: str, data: dict) -> None:
    async with AsyncSessionLocal() as db:
        session = await sio.get_session(sid)
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
        chat.csat_score = int(data["score"])
        chat.csat_comment = data.get("comment")
        await db.commit()


@sio.on("chat:file")
async def chat_file(sid: str, data: dict) -> None:
    data["content"] = data.get("file_name")
    await chat_message(sid, data)


@sio.on("ticket:view:start")
async def ticket_view_start(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") != "agent":
        await emit_error(sid, "Only agents can set ticket presence")
        return
    user = session.get("user") or {}
    ticket_id = _to_uuid(data["ticket_id"])
    viewers = await set_ticket_presence(ticket_id, _to_uuid(user["id"]), True)
    await sio.emit("ticket:presence", {"ticket_id": str(ticket_id), "viewers": viewers}, room=f"org:{user['organization_id']}")


@sio.on("ticket:view:stop")
async def ticket_view_stop(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") != "agent":
        await emit_error(sid, "Only agents can set ticket presence")
        return
    user = session.get("user") or {}
    ticket_id = _to_uuid(data["ticket_id"])
    viewers = await set_ticket_presence(ticket_id, _to_uuid(user["id"]), False)
    await sio.emit("ticket:presence", {"ticket_id": str(ticket_id), "viewers": viewers}, room=f"org:{user['organization_id']}")


@sio.on("chat:snooze")
async def chat_snooze(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") != "agent":
        await emit_error(sid, "Only agents can snooze chats")
        return
    user = session.get("user") or {}
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
        target_agent_id = _to_uuid(data["agent_id"])
        target = (
            await db.execute(
                select(User).where(
                    User.id == target_agent_id,
                    User.organization_id == _to_uuid(user["organization_id"]),
                    User.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if target is None:
            await emit_error(sid, "Snooze target agent not found")
            return
    payload = {"chat_id": str(chat.id), "agent_id": str(target_agent_id), "status": data.get("status", "snoozed")}
    await sio.emit("chat:status:changed", payload, room=f"agent:{target_agent_id}")


@sio.on("whisper")
async def whisper(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    if session.get("kind") != "agent":
        await emit_error(sid, "Only agents can send whispers")
        return
    user = session.get("user") or {}
    target_user_id = _to_uuid(data["target_user_id"])
    async with AsyncSessionLocal() as db:
        target = (
            await db.execute(
                select(User).where(
                    User.id == target_user_id,
                    User.organization_id == _to_uuid(user["organization_id"]),
                    User.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if target is None:
            await emit_error(sid, "Whisper target not found")
            return
    await sio.emit(
        "whisper:new",
        {"from_user_id": user["id"], "message": data.get("message", "")},
        room=f"agent:{target_user_id}",
    )


async def emit_ai_suggestions(agent_id: str, chat_id: str, suggestions: list[str]) -> None:
    await sio.emit("ai:suggestions", {"chat_id": chat_id, "suggestions": suggestions}, room=f"agent:{agent_id}")


def _chat_payload(chat: Chat) -> dict:
    return {key: _json_value(value) for key, value in chat.__dict__.items() if not key.startswith("_")}


async def _chat_payload_with_contact(db, chat: Chat) -> dict:
    payload = _chat_payload(chat)
    payload["visitor_name"] = None
    payload["visitor_email"] = None
    payload["visitor_status"] = "online" if await get_redis().exists(f"presence:visitor:{chat.id}") else "offline"
    if chat.contact_id:
        contact = (
            await db.execute(
                select(Contact).where(Contact.id == chat.contact_id, Contact.organization_id == chat.organization_id)
            )
        ).scalar_one_or_none()
        if contact:
            payload["visitor_name"] = contact.full_name
            payload["visitor_email"] = contact.email
    return payload


def _message_payload(message: Message | None) -> dict | None:
    if message is None:
        return None
    return {key: _json_value(value) for key, value in message.__dict__.items() if not key.startswith("_")}


def _json_value(value: object) -> object:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value
