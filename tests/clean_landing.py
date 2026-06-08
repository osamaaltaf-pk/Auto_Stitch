import re

def clean_landing_page(input_path, output_path):
    print("Reading", input_path)
    content = open(input_path, encoding='utf-8').read()
    
    # 1. Replace the heroImgs block
    hero_pattern = r'const heroImgs = \{.*?home: \'.*?\'\s*\};'
    # Wait, let's see how heroImgs was defined exactly:
    # heroImgs = {
    #   dark: 'data:image/png;base64,...',
    #   ...
    # }
    hero_pattern_2 = r'heroImgs = \{.*?home:.*?\};'
    content = re.sub(r'heroImgs\s*=\s*\{.*?home:[^\}]*\}', '''heroImgs = {
  dark: '/static/dark.png',
  light: '/static/light.png',
  home: '/static/dark.png'
}''', content, flags=re.DOTALL)

    # 2. Replace the dashImgs block
    content = re.sub(r'dashImgs\s*=\s*\{.*?light:[^\}]*\}', '''dashImgs = {
  dark: '/static/dark.png',
  light: '/static/light.png'
}''', content, flags=re.DOTALL)

    # 3. Replace all inline base64 image sources in <img> tags with '/static/dark.png'
    # Match any <img ... src="data:image/...;base64,...">
    img_matches = re.findall(r'<img[^>]*src="data:image/[^"]+"[^>]*>', content)
    print(f"Found {len(img_matches)} base64 <img> tags")
    
    content = re.sub(r'(<img[^>]*src=)"data:image/[^"]+"', r'\1"/static/dark.png"', content)
    
    # 4. Save the cleaned landing page
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Cleaned landing page saved to", output_path)

clean_landing_page('D:/Osama_mvp/autostitch-landing.html', 'D:/Osama_mvp/scratch/cleaned-landing.html')
