
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv("MONGODB_URI") or os.getenv("MONGO_URI"))
db = client.insightai
history_collection = db["history"]

doc = history_collection.find_one(sort=[("_id", -1)])
if doc:
    print("Summary:", doc.get("summary")[:50] if doc.get("summary") else None)
    print("Visualizations:", doc.get("visualizations"))
else:
    print("No doc found")

