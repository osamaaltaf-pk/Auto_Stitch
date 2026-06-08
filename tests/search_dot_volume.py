with open('static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = re.findall(r'\b\w+\.volume\b', content)
print("Matches for property access of .volume:", set(matches))
