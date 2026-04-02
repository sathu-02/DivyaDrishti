from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
import edge_tts
import uuid
import glob
import io
import os

from models import ChatRequest, SignupRequest
from graph import run_graph
from db import users_collection, history_collection

# Load .env from project root (parent of backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# Mount outputs folder
os.makedirs("outputs", exist_ok=True)
os.makedirs("tts_audio", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/tts_audio", StaticFiles(directory="tts_audio"), name="tts_audio")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Upload PDF / DOCX / TXT
# -------------------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc",
        "text/plain": "txt",
    }

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    content_type = file.content_type or ""

    if ext not in ("pdf", "docx", "doc", "txt") and content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Please upload PDF, DOCX, or TXT files."
        )

    # Read file content
    content = await file.read()

    # 5MB limit
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    extracted_text = ""

    try:
        if ext == "pdf":
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text.strip())
            extracted_text = "\n\n".join(pages)

        elif ext in ("docx", "doc"):
            from docx import Document
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            extracted_text = "\n\n".join(paragraphs)

        elif ext == "txt":
            extracted_text = content.decode("utf-8", errors="ignore")

        else:
            raise HTTPException(status_code=400, detail="Could not determine file type.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the file. It may be image-based or empty."
        )

    return {
        "filename": file.filename,
        "text": extracted_text.strip(),
        "length": len(extracted_text.strip()),
        "pages": len(extracted_text.strip().split("\n\n")),
    }


# -------------------------
# Imports for new auth features
# -------------------------
from auth import (
    get_current_user, verify_password, create_access_token,
    hash_password, validate_password_strength, generate_totp_secret,
    get_totp_uri, verify_totp, verify_google_token, sanitize_input,
    check_rate_limit, record_login_attempt, clear_login_attempts,
    generate_email_otp, verify_email_otp, send_otp_email
)


# -------------------------
# Security Headers Middleware
# -------------------------
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# -------------------------
# Signup (with email OTP 2FA)
# -------------------------
class Verify2FARequest(BaseModel):
    email: str
    code: str

class ResendOTPRequest(BaseModel):
    email: str

@app.post("/signup")
async def signup(req: SignupRequest):
    # Sanitize inputs
    username = sanitize_input(req.username)
    email = req.email.strip().lower()

    # Validate password strength
    validate_password_strength(req.password)

    # Check if already registered
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate TOTP secret (for authenticator app option)
    totp_secret = generate_totp_secret()

    # Hash password and store user (not yet email-verified)
    hashed_pw = hash_password(req.password)
    user_id = str(users_collection.insert_one({
        "username": username,
        "email": email,
        "hashed_password": hashed_pw,
        "totp_secret": totp_secret,
        "email_verified": False,
        "auth_provider": "local",
        "created_at": datetime.utcnow().isoformat(),
    }).inserted_id)

    # Generate and send email OTP
    otp_code = generate_email_otp(email)
    send_otp_email(email, otp_code, username)

    return {
        "user_id": user_id,
        "email": email,
        "requires_email_verification": True,
        "message": f"OTP sent to {email}. Please verify to complete signup.",
    }


# -------------------------
# Verify Email OTP (after signup)
# -------------------------
@app.post("/verify-2fa")
async def verify_2fa(req: Verify2FARequest):
    email = req.email.strip().lower()
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_email_otp(email, req.code):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP. Please try again.")

    # Mark email as verified
    users_collection.update_one(
        {"email": email},
        {"$set": {"email_verified": True}}
    )

    # Issue token now that email is verified
    access_token = create_access_token(data={"sub": str(user["_id"])})

    return {
        "message": "Email verified successfully!",
        "access_token": access_token,
        "token_type": "bearer",
    }


# -------------------------
# Resend OTP
# -------------------------
@app.post("/resend-otp")
async def resend_otp(req: ResendOTPRequest):
    email = req.email.strip().lower()
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp_code = generate_email_otp(email)
    sent = send_otp_email(email, otp_code, user.get("username", "User"))

    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")

    return {"message": f"OTP resent to {email}"}


# -------------------------
# Login (with rate limiting + email OTP 2FA)
# -------------------------
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username.strip().lower()

    # Rate limiting
    check_rate_limit(email)

    user = users_collection.find_one({"email": email})

    if not user:
        record_login_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Google-only accounts can't use password login
    if user.get("auth_provider") == "google" and not user.get("hashed_password"):
        raise HTTPException(status_code=400, detail="This account uses Google Sign-In. Please use the Google button.")

    if not verify_password(form_data.password, user["hashed_password"]):
        record_login_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if email-verified 2FA is active
    if user.get("email_verified", False):
        # Check if OTP code is provided (via scopes field)
        otp_code = form_data.scopes[0] if form_data.scopes else ""
        if not otp_code:
            # Generate and send OTP
            code = generate_email_otp(email)
            send_otp_email(email, code, user.get("username", "User"))
            return {
                "requires_2fa": True,
                "email": email,
                "message": "OTP sent to your email. Please check your inbox."
            }
        if not verify_email_otp(email, otp_code):
            record_login_attempt(email)
            raise HTTPException(status_code=401, detail="Invalid or expired OTP code")

    # Success
    clear_login_attempts(email)

    access_token = create_access_token(
        data={"sub": str(user["_id"])}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "requires_2fa": False,
    }


# -------------------------
# Google OAuth Login/Signup
# -------------------------
class GoogleAuthRequest(BaseModel):
    id_token: str

@app.post("/auth/google")
async def google_auth(req: GoogleAuthRequest):
    # Verify the Google token
    google_user = await verify_google_token(req.id_token)

    email = google_user["email"].lower()
    name = google_user["name"]

    # Check if user exists
    user = users_collection.find_one({"email": email})

    if not user:
        # Create new user (no password needed for Google auth)
        user_id = str(users_collection.insert_one({
            "username": name,
            "email": email,
            "hashed_password": "",  # No password for Google accounts
            "auth_provider": "google",
            "google_id": google_user["google_id"],
            "picture": google_user.get("picture", ""),
            "totp_secret": "",
            "totp_verified": False,
            "created_at": datetime.utcnow().isoformat(),
        }).inserted_id)
    else:
        user_id = str(user["_id"])
        # Update Google info if needed
        if user.get("auth_provider") != "google":
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "google_id": google_user["google_id"],
                    "picture": google_user.get("picture", ""),
                }}
            )

    access_token = create_access_token(data={"sub": user_id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_new_user": user is None,
    }


# -------------------------
# Chat (Uses LangGraph)
# -------------------------
@app.post("/chat")
async def chat(
    req: ChatRequest,
    current_user=Depends(get_current_user)
):
    user_id = current_user["user_id"]

    # Limit input size to reduce latency and improve output quality on large texts
    message = req.message
    MAX_CHARS = 8000
    was_truncated = len(message) > MAX_CHARS
    if was_truncated:
        # Smart truncation: keep first 6000 + last 2000 chars to preserve context
        message = message[:6000] + "\n\n[...text truncated for processing...]\n\n" + message[-2000:]

    graph_result = await run_graph(message)

    summary = graph_result["summary"]
    outputs = graph_result["outputs"]

    visualizations = []

    for item in outputs:
        # Cross-platform basename extraction
        clean_path = item["path"].replace("\\", "/")
        filename = clean_path.split("/")[-1]

        visualizations.append({
            "id": filename,
            "type": "image",
            "data": {
                "url": f"http://localhost:8000/outputs/{filename}"
            }
        })

    history_collection.insert_one({
        "user_id": user_id,
        "input_text": req.message,
        "summary": summary,
        "visualizations": visualizations,
        "created_at": datetime.utcnow().isoformat()
    })

    return {
        "summary": summary,
        "visualizations": visualizations
    }


# -------------------------
# Get Current User
# -------------------------
@app.get("/me")
def read_me(current_user=Depends(get_current_user)):
    user_id = current_user["user_id"]
    from bson import ObjectId
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user_id,
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "auth_provider": user.get("auth_provider", "local"),
    }


# -------------------------
# Delete Account
# -------------------------
@app.delete("/me")
def delete_account(current_user=Depends(get_current_user)):
    from bson import ObjectId
    user_id = current_user["user_id"]
    users_collection.delete_one({"_id": ObjectId(user_id)})
    history_collection.delete_many({"user_id": user_id})
    return {"message": "Account deleted successfully"}


# -------------------------
# Feedback
# -------------------------
class FeedbackRequest(BaseModel):
    message: str

@app.post("/feedback")
def send_feedback(req: FeedbackRequest, current_user=Depends(get_current_user)):
    from auth import SMTP_USER, SMTP_PASSWORD, FROM_EMAIL
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from bson import ObjectId

    user_id = current_user["user_id"]
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    sender_info = f"{user.get('username','?')} <{user.get('email','?')}>" if user else user_id

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#1e4063;">New Feedback — DivyaDhrishti</h2>
      <p><strong>From:</strong> {sender_info}</p>
      <hr />
      <p style="white-space:pre-wrap;font-size:1rem;">{req.message}</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[DivyaDhrishti Feedback] from {sender_info}"
    msg["From"] = FROM_EMAIL
    msg["To"] = "divyadhrishti.0102@gmail.com"
    msg.attach(MIMEText(req.message, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, "divyadhrishti.0102@gmail.com", msg.as_string())
        return {"message": "Feedback sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send feedback: {str(e)}")


# -------------------------
# History
# -------------------------
@app.get("/history")
async def get_history(current_user=Depends(get_current_user)):

    user_id = current_user["user_id"]

    records = history_collection.find(
        {"user_id": user_id}
    ).sort("created_at", -1)

    result = []

    for record in records:
        result.append({
            "id": str(record["_id"]),
            "input_text": record["input_text"],
            "summary": record["summary"],
            "visualizations": record["visualizations"],
            "created_at": record["created_at"]
        })

    return result


# -------------------------
# Text-to-Speech (Edge TTS)
# -------------------------
class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-JennyNeural"  # Sweet, natural female voice

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    # Clean up old TTS files (keep last 20)
    old_files = sorted(glob.glob("tts_audio/*.mp3"), key=os.path.getmtime)
    if len(old_files) > 20:
        for f in old_files[:-20]:
            try:
                os.remove(f)
            except Exception:
                pass

    filename = f"tts_{uuid.uuid4().hex[:8]}.mp3"
    filepath = os.path.join("tts_audio", filename)

    try:
        communicate = edge_tts.Communicate(req.text, req.voice, rate="+0%", pitch="+5Hz")
        await communicate.save(filepath)
        return {"audio_url": f"http://localhost:8000/tts_audio/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


# -------------------------
# Available TTS Voices
# -------------------------
@app.get("/tts/voices")
async def list_tts_voices():
    """List available high-quality neural voices."""
    return [
        {"id": "en-US-JennyNeural", "name": "Jenny", "gender": "Female", "accent": "US", "style": "Friendly & warm"},
        {"id": "en-US-AriaNeural", "name": "Aria", "gender": "Female", "accent": "US", "style": "Professional & clear"},
        {"id": "en-US-SaraNeural", "name": "Sara", "gender": "Female", "accent": "US", "style": "Soft & gentle"},
        {"id": "en-GB-SoniaNeural", "name": "Sonia", "gender": "Female", "accent": "British", "style": "Elegant & refined"},
        {"id": "en-IN-NeerjaNeural", "name": "Neerja", "gender": "Female", "accent": "Indian", "style": "Warm & articulate"},
        {"id": "en-US-GuyNeural", "name": "Guy", "gender": "Male", "accent": "US", "style": "Calm & steady"},
        {"id": "en-GB-RyanNeural", "name": "Ryan", "gender": "Male", "accent": "British", "style": "Crisp & authoritative"},
    ]


# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)