
import requests
token = requests.post("http://localhost:8000/login", data={"username": "test5@test.com", "password": "pass"}).json().get("access_token")
resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": "generate a heat map of students studying 5 subjects over 7 days, numbers from 1 to 5"})
print("Visualizations:", resp.json().get("visualizations"))

