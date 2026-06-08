with open("lip_sync_standalone/static/app.js", "r", encoding="utf-8") as f:
    js = f.read()

import re
matches = re.findall(r"[^\n]*character-library[^\n]*", js)
print("Matches for character-library in app.js:")
for m in matches:
    print(m)
