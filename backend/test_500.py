import sys
sys.path.append(r"c:\Users\7430-\DivyaDrishti\backend")

from auth import create_access_token
from db import users_collection
import requests

def test():
    user = users_collection.find_one({"email": {"$ne": None}})
    if not user:
        print("No users found to test with.")
        return
        
    token = create_access_token(data={"sub": str(user["_id"])})
    print("Using token for", user["email"])
    
    # Try to login hitting the API like the frontend
    res = requests.post("http://localhost:8000/login", data={"username": user["email"], "password": "Password123!"})
    print(f"Login Status: {res.status_code}")
    print(f"Login Response: {res.text}")

if __name__ == "__main__":
    test()
