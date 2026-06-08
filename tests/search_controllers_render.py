with open('static/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<SfxController' in line or '<VoiceController' in line:
        print(f"{i+1}: {line.strip()}")
        start = max(0, i-2)
        end = min(len(lines), i+10)
        for j in range(start, end):
            print(f"  {j+1}: {lines[j].rstrip()}")
