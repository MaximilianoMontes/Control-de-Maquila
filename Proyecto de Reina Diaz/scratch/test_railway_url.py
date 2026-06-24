import urllib.request
import json

urls = [
    "https://control-de-maquila.up.railway.app/uploads/db_debug.json",
    "https://control-de-maquila-production.up.railway.app/uploads/db_debug.json",
    "https://control-de-maquila-backend.up.railway.app/uploads/db_debug.json",
    "https://control-de-maquila-api.up.railway.app/uploads/db_debug.json",
    "https://control-de-maquila-production-backend.up.railway.app/uploads/db_debug.json"
]

print("Testing URLs...")
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            code = response.getcode()
            if code == 200:
                print(f"SUCCESS: {url}")
                data = json.loads(response.read().decode('utf-8'))
                print("Successfully loaded data from URL!")
                with open("scratch/db_debug_result.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                print("Saved result to scratch/db_debug_result.json")
                break
            else:
                print(f"Response {code} from {url}")
    except Exception as e:
        print(f"Failed {url}: {e}")
