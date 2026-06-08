content = open('d:/Osama_mvp/static/index.html', encoding='utf-8').read()
lines = content.splitlines()

import sys
sys.stdout.reconfigure(encoding='utf-8')

for idx in range(734, 747):
    print(f"  {idx+1}: {lines[idx]}")
