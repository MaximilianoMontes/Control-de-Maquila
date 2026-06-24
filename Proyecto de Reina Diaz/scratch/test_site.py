import urllib.request
import json

url = "https://control-de-maquila-production.up.railway.app/api/produccion"
print(f"Fetching {url}...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=5) as response:
        content = response.read().decode('utf-8')
        data = json.loads(content)
        filtered = [x for x in data if x.get('producto_modelo') == '752996' or x.get('modelo') == '752996' or x.get('id') == 51]
        print("Filtered Active Production Orders for 752996:")
        print(json.dumps(filtered, indent=2))
except Exception as e:
    print("Error:", e)





