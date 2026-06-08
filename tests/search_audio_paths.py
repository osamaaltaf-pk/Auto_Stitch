with open('static/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '.wav' in line or '/voice/' in line or '/sfx/' in line or 'voiceAudioRef' in line or 'sfxAudioRef' in line:
        print(f"{i+1}: {line.strip()}")
