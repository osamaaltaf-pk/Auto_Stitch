with open('static/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'w-20' in line or 'VIDEO 1' in line or 'SFX 1' in line or 'VOICE 1' in line:
        print(f"{i+1}: {line.strip()}")
