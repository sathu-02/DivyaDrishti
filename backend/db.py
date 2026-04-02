# db.py
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Load .env from project root (parent of backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGO_URI")  # or Atlas URI
client = MongoClient(MONGO_URI)

db = client["insightai"]
users_collection = db["users"]
history_collection = db["history"]