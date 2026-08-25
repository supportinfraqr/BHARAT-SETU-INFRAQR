"""Legacy auth translation: replicate the ASP.NET LoginController flow against migrated Postgres tables.

Uses the fully-migrated `bss_legacy_dbo_logintable` (production login data) and related
permission tables. Captcha answers are stored in Redis (mirrors HttpRuntime.Cache).
"""
import base64
import io
import random
import uuid

import bcrypt
from django.conf import settings
from django.core.cache import cache
from PIL import Image, ImageDraw, ImageFont

from legacy.models import LoginTable  # production login table (full migration)

# Full-migration table (production data) — access via raw SQL through a lightweight model
# We use the migrated production table directly via a raw connection.


def _captcha_font(size=22):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def generate_captcha():
    """Returns (token, expected_answer, image_b64). Mirrors legacy CaptchaImage."""
    a = random.randint(10, 99)
    b = random.randint(0, 9)
    answer = str(a + b)
    token = str(uuid.uuid4())

    img = Image.new("RGB", (130, 30), "white")
    d = ImageDraw.Draw(img)
    d.text((2, 3), f"{a} + {b} = ?", fill="gray", font=_captcha_font())
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    # Store answer for 3 minutes (mirrors HttpRuntime.Cache expiry)
    cache.set(f"CAPTCHA_{token}", answer, timeout=180)
    return token, answer, f"data:image/jpeg;base64,{b64}"


def verify_captcha(token, captcha):
    if not token:
        return "0"
    expected = cache.get(f"CAPTCHA_{token}")
    if expected is None:
        return "0"
    if captcha != expected:
        return "89"
    cache.delete(f"CAPTCHA_{token}")
    return None


def legacy_login_user(request, username, password, captcha_token=None, captcha=None):
    """Replicate legacy GetUserId flow. Returns (code_str_or_None, user_row)."""
    if captcha_token is not None:
        code = verify_captcha(captcha_token, captcha)
        if code:
            return code, None

    row = _fetch_login_by_username(username)
    if not row:
        return None, []
    stored = row.get("Password") or ""
    # Legacy passwords may be plaintext or bcrypt ($2a/$2b/$2y)
    if stored.startswith("$2a$") or stored.startswith("$2b$") or stored.startswith("$2y$"):
        try:
            if not bcrypt.checkpw(password.encode(), stored.encode()):
                return "-1", None
        except Exception:
            return "-1", None
    else:
        if stored != password:
            return "-1", None
        # Upgrade plaintext -> bcrypt
        new_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
        _update_password_hash(row["LoginId"], new_hash)
        stored = new_hash

    # Build legacy response row
    user = {
        "LoginId": row["LoginId"],
        "UserName": row.get("UserName", ""),
        "Name": row.get("Name", ""),
        "LoginType": row.get("LoginType", ""),
        "SessionId": row.get("SessionId", ""),
        "EmailId": row.get("EmailId", ""),
        "BranchCode": row.get("BranchCode", ""),
        "ContactNo": row.get("ContactNo", ""),
        "LastLogin": row.get("LastLogin", ""),
        "CurrentLogin": row.get("CurrentLogin", ""),
    }
    return None, user


def _fetch_login_by_username(username):
    """Query the production login table via Django's legacy model routing to default DB."""
    qs = LoginTable.objects.filter(UserName__iexact=username).values(
        "LoginId", "UserName", "Password", "Name", "LoginType", "SessionId",
        "EmailId", "BranchCode", "ContactNo", "LastLogin"
    )
    for r in qs:
        return r
    return None


def _update_password_hash(login_id, new_hash):
    LoginTable.objects.filter(LoginId=login_id).update(Password=new_hash)
