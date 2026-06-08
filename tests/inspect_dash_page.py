content = open('D:/Osama_mvp/autostitch-landing.html', encoding='utf-8').read()
lines = content.splitlines()
for i, l in enumerate(lines):
    if 'id="dashboardPage"' in l or 'dashboard-page' in l:
        print(f"Line {i+1}: {l.strip()}")
        # print 10 lines after
        print("--- CONTEXT ---")
        for k in range(i, min(len(lines), i+15)):
            print(f"  {k+1}: {lines[k]}")
        print("="*40)
