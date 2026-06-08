def print_script(path):
    content = open(path, encoding='utf-8').read()
    import re
    matches = re.findall(r'<script>.*?</script>', content, re.DOTALL)
    for m in matches:
        print(m)

import sys
sys.stdout.reconfigure(encoding='utf-8')
print_script('D:/Osama_mvp/autostitch-landing.html')
