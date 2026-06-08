content = open('D:/Osama_mvp/static/app.js', encoding='utf-8').read()
lines = content.splitlines()

# Search for nav bar or Projects text inside nav tags
for i, l in enumerate(lines):
    if '<nav' in l and i > 1570:
        print(f"Line {i+1}: {l.strip()}")
        print("--- CONTEXT ---")
        for k in range(max(0, i-2), min(len(lines), i+15)):
            print(f"  {k+1}: {lines[k]}")
        print("="*40)
