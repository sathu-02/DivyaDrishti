# db.py
from pymongo import MongoClient
import os

MONGO_URI = os.getenv("MONGO_URI")  # or Atlas URI
client = MongoClient(MONGO_URI)

db = client["insightai"]
users_collection = db["users"]
history_collection = db["history"]