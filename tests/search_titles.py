content = open('D:/Osama_mvp/autostitch-landing.html', encoding='utf-8').read()
import re
# Find all divs with text-align:center or similar that represent bar-title or names inside dash-bar
titles = re.findall(r'<div[^>]*style=[^>]*>[^<]*</div>', content)
for t in titles:
    if any(k in t.lower() for k in ['timeline', 'studio', 'clip', 'interface', 'autostitch', 'short']):
        print(t)
