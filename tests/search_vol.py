import re

with open('static/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if any(k in line for k in ['videoVolume', 'voiceVolume', 'sfxVolume', 'Volume', 'volume']):
        print(f"{i+1}: {line.strip()}")
