
import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = client.divya_drishti

async def main():
    doc = await db.history.find_one(sort=[("_id", -1)])
    if doc:
        print("Summary:", doc.get("summary")[:50])
        print("Visualizations:", doc.get("visualizations"))
    else:
        print("No doc")

asyncio.run(main())

