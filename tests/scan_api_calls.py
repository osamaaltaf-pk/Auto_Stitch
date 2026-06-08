with open("lip_sync_standalone/static/app.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
fetches = re.findall(r"fetch\([\"']([^\"']+)[\"']", js)
print("Fetch calls in lip_sync_standalone/static/app.js:")
for f in set(fetches):
    print(f"- {f}")
