with open('static/app.js', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('bg-[#090a0f]', 'bg-carbon-card'),
    ('bg-[#0c0d15]/80', 'bg-carbon-card/80'),
    ('bg-[#0c0d13]/85', 'bg-carbon-card/85'),
    ('bg-black overflow-hidden relative border border-carbon-border/60', 'bg-carbon-card overflow-hidden relative border border-carbon-border/60'),
    ('bg-black/60 backdrop-blur-md', 'bg-carbon-card/70 backdrop-blur-md'),
    ('bg-black/70 backdrop-blur-md', 'bg-carbon-card/75 backdrop-blur-md'),
    ('bg-black/60 backdrop-blur', 'bg-carbon-card/70 backdrop-blur'),
    ('fixed inset-0 bg-black/60 backdrop-blur-sm', 'fixed inset-0 bg-carbon/80 backdrop-blur-sm'),
    ('pointer-events-none bg-black/40', 'pointer-events-none bg-carbon-card/60'),
    ('bg-black/40 group cursor-zoom-in', 'bg-carbon-card/50 group cursor-zoom-in'),
    ('bg-black/10 flex flex-col gap-2 relative', 'bg-carbon-panel/20 flex flex-col gap-2 relative'),
    ('bg-black/40 relative', 'bg-carbon-card/40 relative'),
]

total = 0
for old, new in replacements:
    times = content.count(old)
    if times:
        content = content.replace(old, new)
        print(f'  {times}x replaced: {old[:65]}')
        total += times

with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. Total: {total} replacements')
