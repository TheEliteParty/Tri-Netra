"""
JWT Authentication for Tri-Netra API.
Provides token creation, verification, and FastAPI dependency injection.
"""
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import IS_PRODUCTION, JWT_SECRET
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def _hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

security = HTTPBearer(auto_error=False)

def _configured_users() -> dict:
    """Keep demo accounts local and require environment-backed production passwords."""
    definitions = (
        ("admin@trinetra.gov.in", "TRINETRA_ADMIN_PASSWORD", "admin123", "Admin", "admin", ["*"]),
        ("field@trinetra.gov.in", "TRINETRA_FIELD_PASSWORD", "field123", "Field Officer", "field_officer", ["Gangtok"]),
        ("district@trinetra.gov.in", "TRINETRA_DISTRICT_PASSWORD", "district123", "District Admin", "district_admin", ["Gangtok"]),
        ("citizen@trinetra.gov.in", "TRINETRA_CITIZEN_PASSWORD", "demo123", "Citizen", "citizen", ["Gangtok"]),
    )
    users = {}
    for email, env_name, development_password, name, role, districts in definitions:
        password = os.getenv(env_name, "").strip()
        if not password and not IS_PRODUCTION:
            password = development_password
        if IS_PRODUCTION and password and len(password) < 12:
            raise RuntimeError(f"{env_name} must be at least 12 characters in production")
        if password:
            users[email] = {
                "password_hash": _hash_password(password),
                "name": name,
                "role": role,
                "districts": districts,
            }

    if IS_PRODUCTION and "admin@trinetra.gov.in" not in users:
        raise RuntimeError("TRINETRA_ADMIN_PASSWORD is required in production")
    return users


DEMO_USERS = _configured_users()


def authenticate_user(email: str, password: str) -> dict | None:
    """Authenticate a user against the demo user database."""
    normalized_email = (email or "").strip().lower()
    user = DEMO_USERS.get(normalized_email)
    if user:
        if _verify_password(password, user["password_hash"]):
            return {"email": normalized_email, "name": user["name"], "role": user["role"], "districts": user["districts"]}
    return None


def create_token(user_data: dict) -> str:
    """Create a JWT token for the given user data."""
    payload = {
        "sub": user_data["email"],
        "name": user_data["name"],
        "role": user_data["role"],
        "districts": user_data.get("districts", []),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Returns the payload or raises."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """FastAPI dependency that extracts and verifies the current user from the
    Authorization header. Raises 401 if missing or invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(credentials.credentials)


def require_role(*allowed_roles: str):
    """Return a FastAPI dependency that enforces role-based access control.

    Usage:
        @router.put("/admin-only")
        def admin_action(user: dict = Depends(require_role("admin"))):
            ...

        @router.put("/staff-or-above")
        def staff_action(user: dict = Depends(require_role("admin", "field_officer", "district_admin"))):
            ...
    """
    def _role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.get('role')}' is not authorized. Required: {', '.join(allowed_roles)}",
            )
        return user
    return _role_checker
