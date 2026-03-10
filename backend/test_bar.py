
import requests

try:
    resp = requests.post("http://localhost:8000/login", data={"username": "testuser", "password": "password123"})
    token = resp.json().get("access_token")

    resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": "Show me a bar chart of the casualties in world war II"})
    data = resp.json()
    print("Visualizations:", data.get("visualizations"))
except Exception as e:
    print(e)

