import requests

token = requests.post("http://localhost:8000/login", data={"username": "testlong", "password": "pass"}).json().get("access_token")

text = "In 2020, Company A made $500, Company B made $700, and Company C made $300."

resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": f"visualize this data as a bar chart: {text}"})

if resp.status_code == 200:
    for viz in resp.json().get("visualizations", []):
        print(f"Viz: {viz['id']} (URL: {viz['data']['url']})")
else:
    print(f"Error {resp.status_code}: {resp.text}")
