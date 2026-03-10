
import requests

resp = requests.post("http://localhost:8000/signup", json={"username": "tester2", "email": "test2@test.com", "password": "pass"})
print("Signup:", resp.text)

if resp.status_code == 400:
    resp = requests.post("http://localhost:8000/login", data={"username": "test2@test.com", "password": "pass"})
    print("Login:", resp.text)
    
token = resp.json().get("access_token")

resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": "hello"})
print("Chat:", resp.text)

