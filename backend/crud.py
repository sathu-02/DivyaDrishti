import motor.motor_asyncio
from typing import List
from models import PyObjectId, User, HistoryItem
from dotenv import load_dotenv
import os

load_dotenv()
client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = client.visualdb
users_collection = db.users
history_collection = db.history

async def create_user(user: User) -> str:
    result = await users_collection.insert_one(user.dict())
    return str(result.inserted_id)

async def get_user_by_username(username: str):
    return await users_collection.find_one({"username": username})

async def save_history(user_id: str, item: HistoryItem):
    await history_collection.insert_one({"user_id": user_id, **item.dict()})

async def get_user_history(user_id: str) -> List[HistoryItem]:
    cursor = history_collection.find({"user_id": user_id}).sort("created_at", -1)
    return [HistoryItem(**doc) async for doc in cursor]
