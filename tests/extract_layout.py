def extract(path):
    print(f"=== {path} ===")
    content = open(path, encoding='utf-8').read()
    idx = content.find('function App()')
    if idx == -1:
        print("function App() not found")
        return
    lines = content[idx:].splitlines()
    found = False
    for i, line in enumerate(lines):
        if 'return (' in line and 'return () =>' not in line:
            for j in range(i, len(lines)):
                if '<div' in lines[j] or 'className' in lines[j] or 'console' in lines[j].lower():
                    print(f"  {j+1}: {lines[j].strip()}")
                if 'Lanes Area' in lines[j]:
                    print(f"  {j+1}: --- Lanes Area ---")
                if 'LIVE CONSOLE LOGS' in lines[j]:
                    print(f"  {j+1}: --- LIVE CONSOLE LOGS ---")
                if j - i > 600:
                    break
            break

import sys
sys.stdout.reconfigure(encoding='utf-8')
extract('originalstatic/app.js')
extract('static/app.js')
