content = open('D:/Osama_mvp/static/app.js', encoding='utf-8').read()
lines = content.splitlines()
for i, l in enumerate(lines):
    if '<nav' in l or 'Return to Projects Dashboard' in l:
        print(f"{i+1}: {l.strip()}")
        # print 5 lines before and 15 lines after
        print("--- CONTEXT ---")
        for k in range(max(0, i-5), min(len(lines), i+15)):
            print(f"  {k+1}: {lines[k]}")
        print("="*40)
