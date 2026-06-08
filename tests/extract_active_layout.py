def extract_active(path):
    content = open(path, encoding='utf-8').read()
    idx = content.find('function App()')
    lines = content[idx:].splitlines()
    found = False
    for i, line in enumerate(lines):
        if 'return (' in line and 'return () =>' not in line:
            # We want to print around where the main workspace is rendered (e.g. after the project loads)
            for j in range(i, len(lines)):
                if 'nav' in lines[j] or 'flex-1 flex overflow-hidden' in lines[j] or 'w-64' in lines[j] or 'h-44' in lines[j] or 'w-80' in lines[j]:
                    # Print current and next 20 lines
                    print(f"--- Line {j+idx+1} ---")
                    for k in range(max(0, j-2), min(len(lines), j+15)):
                        print(f"  {k+idx+1}: {lines[k]}")
                    print("-" * 30)
            break

import sys
sys.stdout.reconfigure(encoding='utf-8')
extract_active('static/app.js')
