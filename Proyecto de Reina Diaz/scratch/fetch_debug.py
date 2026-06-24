import urllib.request
import json

url = "https://controldemaquilareinadiaz.up.railway.app/uploads/db_debug.json"
print(f"Fetching {url}...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=5) as response:
        code = response.getcode()
        print("Status code:", code)
        raw_body = response.read().decode('utf-8')
        print("Raw body start (first 500 chars):")
        print(raw_body[:500])
except Exception as e:
    print("Error:", e)


