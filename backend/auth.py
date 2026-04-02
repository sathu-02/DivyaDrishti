# auth.py — Hardened authentication with 2FA, Google OAuth, and security features
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
import pyotp
import re
import os
import hashlib
import secrets
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# ================= CONFIG =================

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "insightai-dev-secret-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# SMTP Config
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ================= RATE LIMITING (In-Memory) =================

_login_attempts = {}  # {ip_or_email: [timestamps]}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def check_rate_limit(identifier: str):
    """Block brute-force attacks by limiting login attempts."""
    now = datetime.utcnow()
    if identifier in _login_attempts:
        # Clean old attempts
        _login_attempts[identifier] = [
            t for t in _login_attempts[identifier]
            if (now - t).total_seconds() < LOCKOUT_MINUTES * 60
        ]
        if len(_login_attempts[identifier]) >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail=f"Too many login attempts. Try again in {LOCKOUT_MINUTES} minutes."
            )


def record_login_attempt(identifier: str):
    """Record a failed login attempt."""
    now = datetime.utcnow()
    if identifier not in _login_attempts:
        _login_attempts[identifier] = []
    _login_attempts[identifier].append(now)


def clear_login_attempts(identifier: str):
    """Clear attempts on successful login."""
    _login_attempts.pop(identifier, None)


# ================= PASSWORD UTILS =================

def validate_password_strength(password: str):
    """Enforce strong passwords."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit.")
    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)  # Increased from default 10
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode('utf-8')[:72]
    return bcrypt.checkpw(plain_bytes, hashed.encode('utf-8'))


# ================= 2FA (TOTP) =================

def generate_totp_secret() -> str:
    """Generate a new TOTP secret for 2FA."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    """Generate the OTP auth URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="Divya Drishti")


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code (allows 1 window of drift)."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


# ================= EMAIL OTP =================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random

_email_otps = {}  # {email: {"code": str, "expires": datetime}}
OTP_EXPIRY_MINUTES = 5


def generate_email_otp(email: str) -> str:
    """Generate a 6-digit OTP and store it."""
    code = str(random.randint(100000, 999999))
    _email_otps[email] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    }
    return code


def verify_email_otp(email: str, code: str) -> bool:
    """Verify email OTP."""
    email = email.strip().lower()
    entry = _email_otps.get(email)
    if not entry:
        return False
    if datetime.utcnow() > entry["expires"]:
        _email_otps.pop(email, None)
        return False
    if entry["code"] == code.strip():
        _email_otps.pop(email, None)  # One-time use
        return True
    return False


def send_otp_email(to_email: str, otp_code: str, username: str = "User"):
    """Send a beautifully styled OTP email."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print("SMTP not configured, skipping email.")
        return False

    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #fcfaf4; border-radius: 16px; overflow: hidden; border: 1px solid #efeadd;">
        <div style="background: linear-gradient(135deg, #1e4063 0%, #2d5a8e 100%); padding: 2rem; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700;">Divya Drishti</h1>
            <p style="color: #94a3b8; margin: 0.5rem 0 0 0; font-size: 0.85rem;">Verification Code</p>
        </div>
        <div style="padding: 2rem;">
            <p style="color: #1e4063; font-size: 1rem; margin-bottom: 1.5rem;">Hi <strong>{username}</strong>,</p>
            <p style="color: #475569; font-size: 0.95rem; line-height: 1.6;">Your one-time verification code is:</p>
            <div style="background: #f4e9d5; border-radius: 12px; padding: 1.2rem; text-align: center; margin: 1.5rem 0;">
                <span style="font-size: 2.2rem; font-weight: 700; color: #1e4063; letter-spacing: 8px;">{otp_code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 0.8rem; line-height: 1.5;">This code expires in <strong>5 minutes</strong>. If you didn't request this, please ignore this email.</p>
        </div>
        <div style="background: #f8f6f0; padding: 1.2rem; text-align: center; border-top: 1px solid #efeadd;">
            <p style="color: #94a3b8; font-size: 0.75rem; margin: 0;">&copy; 2026 Divya Drishti — AI Visualization Platform</p>
        </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🔐 Your Divya Drishti OTP: {otp_code}"
    msg["From"] = f"Divya Drishti <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(f"Your Divya Drishti OTP code is: {otp_code}. Valid for 5 minutes.", "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        print(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        return False


# ================= JWT TOKENS =================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16),  # Unique token ID prevents replay attacks
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ================= GOOGLE OAuth =================

async def verify_google_token(id_token: str) -> dict:
    """Verify Google ID token and return user info."""
    import httpx

    # Verify with Google's tokeninfo endpoint
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    payload = resp.json()

    # Verify the token was meant for our app
    if GOOGLE_CLIENT_ID and payload.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token not issued for this app")

    if not payload.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google email not verified")

    return {
        "email": payload["email"],
        "name": payload.get("name", payload["email"].split("@")[0]),
        "picture": payload.get("picture", ""),
        "google_id": payload["sub"],
    }


# ================= INPUT SANITIZATION =================

def sanitize_input(text: str) -> str:
    """Remove potential XSS/injection characters."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove script-like patterns
    text = re.sub(r'(?i)(javascript|on\w+\s*=)', '', text)
    return text.strip()


# ================= DEPENDENCY =================

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")