
import requests

long_text = "Adolf Hitler " * 500

try:
    token = requests.post("http://localhost:8000/login", data={"username": "testuser", "password": "password123"}).json().get("access_token")

    resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": f"generate a pie chart about history from this text: {long_text}"})
    data = resp.json()
    print("Visualizations:", data.get("visualizations"))
    
except Exception as e:
    print(e)

