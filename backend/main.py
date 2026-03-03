from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv
import os

from models import ChatRequest, SignupRequest
from auth import get_current_user, verify_password, create_access_token, hash_password
from graph import run_graph
from db import users_collection, history_collection

load_dotenv()

app = FastAPI()

# Mount outputs folder
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Signup
# -------------------------
@app.post("/signup")
async def signup(req: SignupRequest):
    existing_user = users_collection.find_one({"email": req.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = hash_password(req.password)
    user_id = str(users_collection.insert_one({
        "username": req.username,
        "email": req.email,
        "hashed_password": hashed_pw
    }).inserted_id)
    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}



# -------------------------
# Login
# -------------------------
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):

    user = users_collection.find_one({"email": form_data.username})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": str(user["_id"])}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
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

    graph_result = await run_graph(req.message)

    summary = graph_result["summary"]
    outputs = graph_result["outputs"]

    visualizations = []

    for item in outputs:
        filename = item["path"].split("/")[-1]

        visualizations.append({
            "id": filename,
            "type": "image",
            "data": {
                "url": f"http://localhost:8000/{filename}"
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
    return current_user


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
# Run Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)