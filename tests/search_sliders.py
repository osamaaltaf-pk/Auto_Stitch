with open('static/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'type="range"' in line or 'min="0" max="1"' in line:
        print(f"{i+1}: {line.strip()}")
