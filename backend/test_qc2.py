
import requests
resp = requests.post("https://quickchart.io/graphviz", json={"graph": "digraph{a->b}"})
print(resp.status_code)
# or maybe data={"graph": "digraph{A->B}"}
resp2 = requests.post("https://quickchart.io/graphviz", data={"graph": "digraph{a->b}"})
print(resp2.status_code)

