"""Operating-hours evaluator.

Config shape:
    {
        "enabled": true,
        "timezone": "America/New_York",
        "schedule": {
            "mon": [{"open": "09:00", "close": "17:00"}],
            "tue": [...], ...
        }
    }
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import Iterable

try:  # pragma: no cover
    from zoneinfo import ZoneInfo
except Exception:  # noqa: BLE001
    ZoneInfo = None  # type: ignore[assignment]


DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def _localize(now_utc: datetime, tz_name: str) -> datetime:
    if ZoneInfo is None:
        return now_utc
    try:
        return now_utc.astimezone(ZoneInfo(tz_name))
    except Exception:  # noqa: BLE001
        return now_utc


def is_open(config: dict | None, now_utc: datetime | None = None) -> bool:
    """Return True if the workspace is currently in operating hours."""

    if not config or not config.get("enabled"):
        return True
    schedule = config.get("schedule") or {}
    tz_name = config.get("timezone") or "UTC"
    now = _localize(now_utc or datetime.now(timezone.utc), tz_name)
    day_key = DAY_KEYS[now.weekday()]
    intervals: Iterable[dict] = schedule.get(day_key, [])
    current_t = now.time()
    for interval in intervals:
        try:
            start = _parse_hhmm(str(interval.get("open", "00:00")))
            end = _parse_hhmm(str(interval.get("close", "23:59")))
        except Exception:  # noqa: BLE001
            continue
        if start <= current_t <= end:
            return True
    return False


def next_open_at(config: dict | None, now_utc: datetime | None = None) -> datetime | None:
    if not config or not config.get("enabled"):
        return None
    schedule = config.get("schedule") or {}
    tz_name = config.get("timezone") or "UTC"
    now = _localize(now_utc or datetime.now(timezone.utc), tz_name)
    for offset in range(0, 8):
        probe = now + timedelta(days=offset)
        day_key = DAY_KEYS[probe.weekday()]
        intervals = schedule.get(day_key) or []
        for interval in intervals:
            try:
                start = _parse_hhmm(str(interval.get("open", "00:00")))
            except Exception:  # noqa: BLE001
                continue
            candidate = probe.replace(hour=start.hour, minute=start.minute, second=0, microsecond=0)
            if candidate > now:
                return candidate
    return None
