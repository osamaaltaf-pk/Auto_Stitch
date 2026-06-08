import re

with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    code = f.read()

# Find all lines starting with @app.get or @app.post
routes = re.findall(r"@app\.(get|post|delete|put|patch)\(\"([^\"]+)\"", code)
print("Routes in lip_sync_standalone/app.py:")
for r in routes:
    print(f"- {r[0].upper()} {r[1]}")
