
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv("MONGODB_URI") or os.getenv("MONGO_URI"))
db = client.insightai
history_collection = db["history"]

docs = history_collection.find().sort([("_id", -1)]).limit(5)
for doc in docs:
    print(doc["_id"])
    print("Visualizations:", len(doc.get("visualizations", [])), "items")
    for v in doc.get("visualizations", []):
        print("  -", v)
    print("-" * 20)

