"""Authenticated, district-scoped alert WebSocket connections."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket


def normalize_district(value: str | None) -> str:
    """Return a stable subscription key and reject unsafe/unbounded values."""
    district = (value or "all").strip()
    if not district or len(district) > 100 or any(ch in district for ch in "\r\n\0"):
        raise ValueError("Invalid district")
    return district


def can_subscribe(user: dict[str, Any], district: str) -> bool:
    """Authorize a district against the claims embedded in the JWT."""
    requested = normalize_district(district).casefold()
    allowed = user.get("districts") or []
    allowed_keys = {str(item).strip().casefold() for item in allowed}
    return "*" in allowed_keys or requested in allowed_keys


@dataclass
class Subscription:
    district: str
    subject: str


class AlertConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[WebSocket, Subscription] = {}

    async def connect(self, websocket: WebSocket, *, district: str, user: dict[str, Any]) -> None:
        await websocket.accept()
        self._connections[websocket] = Subscription(
            district=normalize_district(district),
            subject=str(user.get("sub", "unknown")),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    def subscribe(self, websocket: WebSocket, district: str) -> None:
        subscription = self._connections[websocket]
        subscription.district = normalize_district(district)

    async def broadcast(self, message: dict[str, Any], district: str | None = None) -> None:
        event_district = normalize_district(district or message.get("district", "all")).casefold()
        disconnected: list[WebSocket] = []
        for connection, subscription in list(self._connections.items()):
            subscriber_district = subscription.district.casefold()
            if subscriber_district != "all" and subscriber_district != event_district:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for connection in disconnected:
            self.disconnect(connection)


manager = AlertConnectionManager()


async def publish_alert_event(
    event_type: str,
    alert: dict[str, Any],
    *,
    district: str | None = None,
) -> None:
    """Publish an alert lifecycle event to matching district subscribers."""
    event_district = normalize_district(district or alert.get("district", "all"))
    await manager.broadcast(
        {"type": event_type, "district": event_district, "alert": alert},
        district=event_district,
    )
