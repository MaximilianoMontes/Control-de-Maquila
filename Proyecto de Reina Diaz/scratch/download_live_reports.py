import urllib.request
import urllib.parse
import os

BASE_URL = "https://control-de-maquila-production.up.railway.app"
REPORTS = {
    "produccion": "/api/reportes/produccion",
    "inventario": "/api/reportes/inventario",
    "recoleccion": "/api/reportes/recoleccion",
    "pagos": "/api/reportes/pagos"
}

def download_reports():
    print(f"Connecting to live production server: {BASE_URL}")
    for name, path in REPORTS.items():
        url = f"{BASE_URL}{path}"
        out_file = f"scratch/live_{name}.pdf"
        print(f"Downloading {name} report from {url}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as response:
                code = response.getcode()
                content_type = response.headers.get('Content-Type', '')
                print(f"  Status: {code}, Content-Type: {content_type}")
                if code == 200 and 'application/pdf' in content_type:
                    data = response.read()
                    with open(out_file, 'wb') as f:
                        f.write(data)
                    print(f"  Saved to {out_file} ({len(data)} bytes)")
                else:
                    body = response.read().decode('utf-8', errors='ignore')
                    print(f"  FAILED: Unexpected response. Body: {body[:300]}")
        except Exception as e:
            print(f"  ERROR: {e}")

if __name__ == "__main__":
    download_reports()
