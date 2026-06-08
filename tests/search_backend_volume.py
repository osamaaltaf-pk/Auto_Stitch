with open('app/core/stitcher.py', 'r', encoding='utf-8') as f:
    stitcher_lines = f.readlines()

for i, line in enumerate(stitcher_lines):
    if 'volume' in line.lower():
        print(f"stitcher.py L{i+1}: {line.strip()}")

print("\n")

with open('main.py', 'r', encoding='utf-8') as f:
    main_lines = f.readlines()

for i, line in enumerate(main_lines):
    if 'volume' in line.lower():
        print(f"main.py L{i+1}: {line.strip()}")
