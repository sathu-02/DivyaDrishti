
import requests

long_text = "Adolf Hitler " * 500

try:
    resp = requests.post("http://localhost:8000/signup", json={"username": "testlong", "email": "long@test.com", "password": "pass"})
    if resp.status_code != 200:
        resp = requests.post("http://localhost:8000/login", data={"username": "long@test.com", "password": "pass"})
    
    token = resp.json().get("access_token")

    resp2 = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": f"generate a pie chart about history from this text: {long_text}"})
    print(resp2.status_code)
    print(resp2.text)
    
except Exception as e:
    print(e)

