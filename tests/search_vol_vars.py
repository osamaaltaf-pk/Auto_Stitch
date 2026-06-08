import re

with open('static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find any occurrences of word characters ending with volume/vol, or block.volume/layer.volume
matches = re.findall(r'\b[a-zA-Z0-9_]*vol[a-zA-Z0-9_]*\b', content, re.IGNORECASE)
unique_matches = set(matches)
print("Unique matches with 'vol':", unique_matches)
