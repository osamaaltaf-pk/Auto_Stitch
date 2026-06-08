content = open('d:/Osama_mvp/static/index.html', encoding='utf-8').read()
lines = content.splitlines()

import sys
sys.stdout.reconfigure(encoding='utf-8')

for i, l in enumerate(lines):
    if 'projectsPage' in l or 'dashboardPage' in l or 'landingPage' in l:
        print(f"Line {i+1}: {l.strip()}")
