def find_js_logic(path):
    content = open(path, encoding='utf-8').read()
    # Find any <script> blocks or theme switcher logic
    import re
    matches = re.findall(r'<script>.*?</script>', content, re.DOTALL)
    for m in matches:
        print("=== SCRIPT ===")
        # Print lines in script that contain heroImg, dashImg, active, or switch
        lines = m.splitlines()
        for i, l in enumerate(lines):
            if any(k in l for k in ['heroImg', 'dashImg', 'active', 'switch', 'light', 'dark', 'Img', 'png']):
                print(f"  {i+1}: {l.strip()}")

find_js_logic('D:/Osama_mvp/autostitch-landing.html')
