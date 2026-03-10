
import requests
resp = requests.get("https://quickchart.io/graphviz?graph=digraph{a->b}")
print(resp.status_code, len(resp.content))

