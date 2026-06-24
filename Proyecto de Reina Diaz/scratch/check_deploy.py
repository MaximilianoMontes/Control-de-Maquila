import urllib.request
import json
import time

url = "https://control-de-maquila.up.railway.app/uploads/db_debug.json"

print("Polling for deployment...")
for i in range(15):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            code = response.getcode()
            if code == 200:
                print("SUCCESS!")
                data = json.loads(response.read().decode('utf-8'))
                with open("scratch/db_debug_result.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                print("Saved result to scratch/db_debug_result.json")
                exit(0)
    except Exception as e:
        print(f"Attempt {i+1} failed: {e}")
    time.sleep(5)

print("Polling timed out.")
