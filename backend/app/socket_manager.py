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
from app.models.message import Message
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


async def emit_unique(event: str, payload: dict, rooms: list[str]) -> None:
    sent: set[str] = set()
    for room in rooms:
        for sid, _ in sio.manager.get_participants("/", room):
            if sid in sent:
                continue
            sent.add(sid)
            await sio.emit(event, payload, to=sid)


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
            )
            await sio.enter_room(sid, f"chat:{chat.id}")
            await sio.save_session(sid, {"kind": "widget", "chat_id": str(chat.id), "organization_id": str(chat.organization_id)})
            await set_visitor_presence(chat, True)
            payload = {"chat": await _chat_payload_with_contact(db, chat), "message": _message_payload(message) if message else None}
            await sio.emit("chat:started", payload, to=sid)
            await sio.emit("chat:new", payload, room=f"org:{chat.organization_id}")
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
            message = await add_message(db, chat, sender_type, data.get("content"), sender_id, is_internal)
            await db.commit()
            if not message.is_internal:
                payload = _message_payload(message)
                rooms = [f"chat:{chat.id}", f"org:{chat.organization_id}"]
                if chat.assigned_user_id:
                    rooms.append(f"agent:{chat.assigned_user_id}")
                await emit_unique("chat:message:new", payload, rooms)
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
    sender_type = "agent" if session.get("kind") == "agent" else "customer"
    await sio.emit("chat:typing", {"chat_id": str(chat.id), "typing": True, "sender_type": sender_type}, room=f"chat:{chat.id}", skip_sid=sid)


@sio.on("chat:typing:stop")
async def typing_stop(sid: str, data: dict) -> None:
    session = await sio.get_session(sid)
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
    sender_type = "agent" if session.get("kind") == "agent" else "customer"
    await sio.emit("chat:typing", {"chat_id": str(chat.id), "typing": False, "sender_type": sender_type}, room=f"chat:{chat.id}", skip_sid=sid)


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
    async with AsyncSessionLocal() as db:
        chat = await _chat_for_session(db, session, _to_uuid(data["chat_id"]))
    await sio.enter_room(sid, f"chat:{chat.id}")
    if session.get("kind") == "widget":
        async with AsyncSessionLocal() as db:
            await sio.save_session(sid, {"kind": "widget", "chat_id": str(chat.id), "organization_id": str(chat.organization_id)})
            await set_visitor_presence(chat, True)


@sio.on("agent:leave:chat")
async def leave_chat(sid: str, data: dict) -> None:
    await sio.leave_room(sid, f"chat:{data.get('chat_id')}")


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
        payload = {"chat_id": str(chat.id), "assigned_user_id": str(chat.assigned_user_id)}
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
