import os

log_dir = r"C:\Users\Sistemas\.gemini\antigravity-ide\brain\f1ee3bfc-b460-453b-bd31-82c270963332\.system_generated\tasks"
files = os.listdir(log_dir)
print("Files in tasks log dir:", files)

target = "task-2014.log"
if target in files:
    with open(os.path.join(log_dir, target), "r") as f:
        print("--- CONTENT ---")
        print(f.read())
else:
    print(f"Log file {target} not found yet.")
