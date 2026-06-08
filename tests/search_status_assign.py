with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'status =' in line or 'status=' in line:
        print(f"{i+1}: {line.strip()}")
