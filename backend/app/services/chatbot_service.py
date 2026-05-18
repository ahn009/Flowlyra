"""Chatbot runtime + flow engine."""
from __future__ import annotations

import logging
import random
import re
import uuid
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Chat
from app.models.chatbot import ChatbotFlow, ChatbotSession
from app.services import ai_service, rag_service
from app.services.ai_provider import AIProviderError, get_ai_provider

logger = logging.getLogger(__name__)


async def list_flows(db: AsyncSession, org_id: uuid.UUID) -> list[ChatbotFlow]:
    rows = (
        await db.execute(
            select(ChatbotFlow)
            .where(ChatbotFlow.organization_id == org_id)
            .order_by(ChatbotFlow.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


async def get_flow(db: AsyncSession, org_id: uuid.UUID, flow_id: uuid.UUID) -> ChatbotFlow | None:
    return (
        await db.execute(
            select(ChatbotFlow).where(
                ChatbotFlow.id == flow_id, ChatbotFlow.organization_id == org_id
            )
        )
    ).scalar_one_or_none()


async def find_active_flow(
    db: AsyncSession, org_id: uuid.UUID, *, widget_id: uuid.UUID | None, url: str | None = None
) -> ChatbotFlow | None:
    q = select(ChatbotFlow).where(
        ChatbotFlow.organization_id == org_id, ChatbotFlow.status == "active"
    )
    if widget_id:
        q = q.where((ChatbotFlow.widget_id == widget_id) | (ChatbotFlow.widget_id.is_(None)))
    candidates = (await db.execute(q)).scalars().all()
    matched: list[ChatbotFlow] = []
    for flow in candidates:
        trig = flow.trigger or {}
        urlmatch = trig.get("url_contains")
        if urlmatch and url and urlmatch not in url:
            continue
        matched.append(flow)
    if not matched:
        return None
    # AB split
    by_group: dict[uuid.UUID | None, list[ChatbotFlow]] = {}
    for f in matched:
        key = f.ab_variant_of or f.id
        by_group.setdefault(key, []).append(f)
    group = next(iter(by_group.values()))
    weights = [max(1, f.ab_weight) for f in group]
    return random.choices(group, weights=weights, k=1)[0]


async def start_session(
    db: AsyncSession, *, flow: ChatbotFlow, chat: Chat
) -> ChatbotSession:
    entry = _entry_node(flow)
    session = ChatbotSession(
        organization_id=flow.organization_id,
        flow_id=flow.id,
        chat_id=chat.id,
        current_node=entry,
        state={"vars": dict(flow.variables or {})},
        status="active",
    )
    db.add(session)
    await db.flush()
    return session


def _entry_node(flow: ChatbotFlow) -> str | None:
    nodes = flow.nodes or []
    if not nodes:
        return None
    for n in nodes:
        if n.get("type") == "start" or n.get("is_start"):
            return n.get("id")
    return nodes[0].get("id")


def _node_by_id(flow: ChatbotFlow, node_id: str | None) -> dict | None:
    if not node_id:
        return None
    for n in flow.nodes or []:
        if n.get("id") == node_id:
            return n
    return None


def _next_edge(flow: ChatbotFlow, from_id: str, branch: str | None = None) -> str | None:
    for e in flow.edges or []:
        if e.get("from") != from_id:
            continue
        if branch is None or e.get("branch") in (None, branch):
            return e.get("to")
    return None


def _render(template: str, vars_: dict) -> str:
    def sub(m: re.Match[str]) -> str:
        key = m.group(1).strip()
        return str(vars_.get(key, ""))

    return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", sub, template or "")


async def advance(
    db: AsyncSession,
    session: ChatbotSession,
    user_input: str | None,
) -> list[dict[str, Any]]:
    """Step through nodes until awaiting input or terminal. Returns list of output messages."""
    flow = await get_flow(db, session.organization_id, session.flow_id)
    if not flow:
        session.status = "ended"
        return []
    outputs: list[dict[str, Any]] = []
    vars_: dict[str, Any] = (session.state or {}).get("vars", {})

    node = _node_by_id(flow, session.current_node)
    # Apply pending input to question node
    if node and node.get("type") == "question" and user_input is not None:
        var = node.get("variable") or node.get("id")
        vars_[var] = user_input
        # advance to next
        session.current_node = _next_edge(flow, node["id"])
        node = _node_by_id(flow, session.current_node)

    safety = 25
    while node and safety > 0:
        safety -= 1
        ntype = node.get("type")
        if ntype in ("message", "start"):
            text = _render(node.get("text", ""), vars_)
            if text:
                outputs.append({"type": "message", "content": text, "quick_replies": node.get("quick_replies") or []})
            session.current_node = _next_edge(flow, node["id"])
            node = _node_by_id(flow, session.current_node)
            continue
        if ntype == "question":
            text = _render(node.get("text", ""), vars_)
            if text:
                outputs.append(
                    {
                        "type": "message",
                        "content": text,
                        "quick_replies": node.get("quick_replies") or [],
                    }
                )
            session.state = {**(session.state or {}), "vars": vars_}
            return outputs
        if ntype == "condition":
            cond = node.get("condition") or {}
            var = cond.get("variable")
            op = cond.get("op", "eq")
            value = cond.get("value")
            actual = vars_.get(var)
            branch = "true" if _eval_cond(actual, op, value) else "false"
            session.current_node = _next_edge(flow, node["id"], branch=branch)
            node = _node_by_id(flow, session.current_node)
            continue
        if ntype == "action":
            action = node.get("action") or {}
            kind = action.get("kind")
            if kind == "http":
                await _do_http(action, vars_)
            elif kind == "set_var":
                vars_[action.get("variable")] = _render(str(action.get("value", "")), vars_)
            session.current_node = _next_edge(flow, node["id"])
            node = _node_by_id(flow, session.current_node)
            continue
        if ntype == "faq":
            answer = await _faq_answer(db, session.organization_id, user_input or node.get("query", ""))
            outputs.append({"type": "message", "content": answer})
            session.current_node = _next_edge(flow, node["id"])
            node = _node_by_id(flow, session.current_node)
            continue
        if ntype == "handoff":
            session.handed_off = True
            session.status = "handed_off"
            outputs.append({"type": "handoff", "content": _render(node.get("text", "Connecting you to an agent..."), vars_)})
            session.state = {**(session.state or {}), "vars": vars_}
            return outputs
        # unknown - end
        break

    session.completed = True
    session.status = "completed"
    session.state = {**(session.state or {}), "vars": vars_}
    return outputs


def _eval_cond(actual: Any, op: str, expected: Any) -> bool:
    try:
        if op == "eq":
            return str(actual).lower() == str(expected).lower()
        if op == "neq":
            return str(actual).lower() != str(expected).lower()
        if op == "contains":
            return str(expected).lower() in str(actual).lower()
        if op == "gt":
            return float(actual) > float(expected)
        if op == "lt":
            return float(actual) < float(expected)
        if op == "in":
            return str(actual) in (expected or [])
    except (ValueError, TypeError):
        return False
    return False


async def _do_http(action: dict, vars_: dict) -> None:
    url = _render(action.get("url", ""), vars_)
    if not url:
        return
    method = (action.get("method") or "POST").upper()
    payload = action.get("body") or {}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.request(method, url, json=payload, headers=action.get("headers") or {})
            if action.get("save_to"):
                try:
                    vars_[action["save_to"]] = resp.json()
                except ValueError:
                    vars_[action["save_to"]] = resp.text
    except Exception as exc:  # noqa: BLE001
        logger.warning("chatbot http action failed: %s", exc)


async def _faq_answer(db: AsyncSession, org_id: uuid.UUID, question: str) -> str:
    if not question.strip():
        return ""
    hits = await rag_service.search(db, org_id, question, top_k=3)
    if not hits:
        provider = get_ai_provider()
        if not provider.configured:
            return "I couldn't find that. Let me connect you to an agent."
        try:
            return await provider.chat(
                system="Answer the customer briefly. If unsure, say you'll connect them to an agent.",
                messages=[{"role": "user", "content": question}],
                temperature=0.2,
                max_tokens=300,
            )
        except AIProviderError:
            return "Let me connect you to an agent."
    context = "\n\n".join(
        f"[{(h.get('meta') or {}).get('title') or 'kb'}]\n{h.get('content', '')[:600]}" for h in hits
    )
    provider = get_ai_provider()
    if not provider.configured:
        return hits[0].get("content", "")[:400]
    try:
        return await provider.chat(
            system="Answer using ONLY the knowledge. If knowledge is insufficient, say so.",
            messages=[{"role": "user", "content": f"KNOWLEDGE:\n{context}\n\nQUESTION:\n{question}"}],
            temperature=0.2,
            max_tokens=500,
        )
    except AIProviderError:
        return hits[0].get("content", "")[:400]
