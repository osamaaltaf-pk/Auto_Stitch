content = open('D:/Osama_mvp/autostitch-landing.html', encoding='utf-8').read()
lines = content.splitlines()

import sys
sys.stdout.reconfigure(encoding='utf-8')

print("=== Dashboard Page Structure ===")
for idx in range(735, 785):
    print(f"  {idx+1}: {lines[idx]}")
