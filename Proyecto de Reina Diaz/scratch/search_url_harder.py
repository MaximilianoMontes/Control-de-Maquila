import json

log_path = r"C:\Users\Sistemas\.gemini\antigravity-ide\brain\f1ee3bfc-b460-453b-bd31-82c270963332\.system_generated\logs\transcript.jsonl"

print("Searching logs for any URL or endpoint...")
with open(log_path, 'r', encoding='utf-8') as f:
    for count, line in enumerate(f, 1):
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if content:
                for word in content.split():
                    if 'http' in word or '.app' in word or 'railway' in word:
                        print(f"Line {count}: {word}")
        except Exception as e:
            pass
