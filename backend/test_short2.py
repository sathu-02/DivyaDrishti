import requests

token = requests.post("http://localhost:8000/login", data={"username": "testlong", "password": "pass"}).json().get("access_token")

text = "Adolf Hitler was an Austrian-born German politician and the leader of the Nazi Party, serving as Germanys dictator from 1933 until his suicide in 1945. He played a pivotal role in the events leading up to World War II, including the invasion of Poland. His regime was marked by rapid economic recovery but also by ruthless policies against Jews and other minorities, leading to the Holocaust. Hitlers early life was characterized by familial conflicts and significant educational influences. Despite his complex ancestry and early challenges, he rose to profound political prominence, leaving a lasting impact on history."

resp = requests.post("http://localhost:8000/chat", headers={"Authorization": f"Bearer {token}"}, json={"message": f"visualize this history comprehensively with a timeline and a pie chart: {text}"})

if resp.status_code == 200:
    for viz in resp.json().get("visualizations", []):
        print(f"Viz: {viz['id']} (URL: {viz['data']['url']})")
else:
    print(f"Error {resp.status_code}: {resp.text}")
