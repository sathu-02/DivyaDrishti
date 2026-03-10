
import requests

resp = requests.post("http://localhost:8000/login", data={"username": "test5@test.com", "password": "pass"})
token = resp.json().get("access_token")

resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": "Show me a flowchart of World War II"})
data = resp.json()
print("Chat Visualizations:", data.get("visualizations"))

