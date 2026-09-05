"""
Rate Limiter Middleware for GeoShield API
Limits request frequency per IP to prevent abuse.
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RateLimiter(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter.
    Limits: 100 requests/minute for general API, 10 requests/minute for auth.
    """

    def __init__(self, app, general_limit: int = 100, auth_limit: int = 10, window_seconds: int = 60):
        super().__init__(app)
        self.general_limit = general_limit
        self.auth_limit = auth_limit
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _is_rate_limited(self, client_ip: str, path: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds

        # Use stricter limit for auth endpoints
        limit = self.auth_limit if "/auth/" in path else self.general_limit
        key = f"{client_ip}:{'auth' if '/auth/' in path else 'general'}"

        # Clean old entries
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        if len(self.requests[key]) >= limit:
            return True

        self.requests[key].append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)

        # Skip rate limiting for health check and static files
        if request.url.path in ["/api/health", "/api/health"] or not request.url.path.startswith("/api/"):
            return await call_next(request)

        if self._is_rate_limited(client_ip, request.url.path):
            return Response(
                content='{"detail":"Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window_seconds)},
            )

        return await call_next(request)
