
import requests
token = requests.post("http://localhost:8000/login", data={"username": "test5@test.com", "password": "pass"}).json().get("access_token")
resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": "generate a pie chart of 6 million jews and 19.3 million civilians"})
print(resp.json())

