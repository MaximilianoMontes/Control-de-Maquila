import urllib.request
import json
import time

url = "https://control-de-maquila-production.up.railway.app/uploads/db_debug.json"

print("Polling for deployment v4...")
for i in range(40):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            code = response.getcode()
            if code == 200:
                data = json.loads(response.read().decode('utf-8'))
                # Check if v4 migration has run by searching for it in historial
                history = data.get("historial", [])
                v4_run = any("revert_split_model_752996_v4" in str(h.get("description", "")) or "Restauró orden de Jairo a 216 pzas" in str(h.get("description", "")) for h in history)
                if v4_run:
                    print("SUCCESS! V4 Migration is live!")
                    with open("scratch/db_debug_result.json", "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2)
                    print("Saved result to scratch/db_debug_result.json")
                    exit(0)
                else:
                    print(f"Attempt {i+1}: Site is online but V4 migration has not run yet...")
    except Exception as e:
        print(f"Attempt {i+1} failed: {e}")
    time.sleep(5)


print("Polling timed out.")
exit(1)

