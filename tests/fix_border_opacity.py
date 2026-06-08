with open('static/app.js', encoding='utf-8') as f:
    content = f.read()

# Bring border opacities back down to subtle levels matching dashboard.png
replacements = [
    # Main section dividers - very subtle
    ('border-carbon-border/80 pb-6', 'border-carbon-border/30 pb-6'),
    ('border-carbon-border/80 pb-2', 'border-carbon-border/30 pb-2'),
    # Timeline lane tracks - subtle
    ('border-carbon-border/60 flex items-center pl-2 font-mono text-[10px] text-gray-400',
     'border-carbon-border/20 flex items-center pl-2 font-mono text-[10px] text-gray-400'),
    # Section dividers inside panels - subtle
    ('border-t border-carbon-border/60 pt-4 mt-2', 'border-t border-carbon-border/20 pt-4 mt-2'),
    ('border-t border-carbon-border/60 pt-4 mt-auto', 'border-t border-carbon-border/20 pt-4 mt-auto'),
    # Inner dividers
    ('border-t border-carbon-border/40', 'border-t border-carbon-border/15'),
]

total = 0
for old, new in replacements:
    times = content.count(old)
    if times:
        content = content.replace(old, new)
        print(f'  {times}x: {old[:65]}')
        total += times
    else:
        print(f'  SKIP: {old[:65]}')

with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. Total: {total}')
