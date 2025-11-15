# security.py
from passlib.context import CryptContext
import hmac
import hashlib
from datetime import datetime, timezone

def _normalize_signature(sig: str) -> str:
    """Strip common prefixes like 'sha256=' and return hex digest string."""
    sig = sig.strip()
    if sig.lower().startswith("sha256="):
        return sig.split("=", 1)[1]
    return sig

def verify_hmac_signature(
    signature: str,
    body: bytes,
    secret: str,
    timestamp: str | None = None,
    tolerance_seconds: int = 300,
) -> bool:
    """Verify HMAC SHA256 signature.

    If a timestamp is provided, reject requests older than `tolerance_seconds`.
    Signature is computed over body; if timestamp is provided, compute over
    f"{timestamp}.{body}" for additional replay resistance.
    """
    try:
        hex_sig = _normalize_signature(signature)
        key = secret.encode("utf-8")
        msg = body if timestamp is None else (f"{timestamp}.".encode("utf-8") + body)
        digest = hmac.new(key, msg, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(digest, hex_sig):
            return False

        if timestamp is not None:
            try:
                ts = int(timestamp)
                now = int(datetime.now(timezone.utc).timestamp())
                if abs(now - ts) > tolerance_seconds:
                    return False
            except Exception:
                return False
        return True
    except Exception:
        return False

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


def get_password_hash(password: str):
    return pwd_context.hash(password)