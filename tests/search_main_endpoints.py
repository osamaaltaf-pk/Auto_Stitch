with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '/generate/tts' in line or '/generate/sfx' in line or 'def generate_tts' in line or 'def generate_sfx' in line or '/api/render' in line:
        print(f"{i+1}: {line.strip()}")
        start = max(0, i-5)
        end = min(len(lines), i+25)
        print("--- CONTEXT ---")
        for j in range(start, end):
            print(f"  {j+1}: {lines[j].rstrip()}")
        print("---------------\n")
