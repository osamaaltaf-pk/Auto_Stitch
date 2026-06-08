content = open('D:/Osama_mvp/autostitch-landing.html', encoding='utf-8').read()
import re
# Find where const heroImgs or heroImgs = is defined
idx = content.find('heroImgs')
if idx != -1:
    print("Found heroImgs at:", idx)
    print(content[idx:idx+800])
else:
    print("heroImgs not found")

idx2 = content.find('dashImgs')
if idx2 != -1:
    print("Found dashImgs at:", idx2)
    print(content[idx2:idx2+800])
else:
    print("dashImgs not found")
