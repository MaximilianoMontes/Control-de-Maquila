import json

log_path = r"C:\Users\Sistemas\.gemini\antigravity-ide\brain\f1ee3bfc-b460-453b-bd31-82c270963332\.system_generated\logs\transcript.jsonl"

print("Searching logs for opened browser URLs...")
with open(log_path, 'r', encoding='utf-8') as f:
    for count, line in enumerate(f, 1):
        try:
            data = json.loads(line)
            # Check for tool_calls with url or browser
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    args = tc.get('argumentsJson', '')
                    if 'url' in args.lower() or 'browser' in tc.get('name', '').lower():
                        print(f"Line {count}: {tc.get('name')} -> {args}")
        except Exception as e:
            pass
