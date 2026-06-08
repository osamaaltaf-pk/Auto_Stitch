with open('static/app.js', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # Timeline column ruler ticks — too faint
    ('border-carbon-border/30 flex items-center pl-2 font-mono text-[10px] text-gray-500',
     'border-carbon-border/60 flex items-center pl-2 font-mono text-[10px] text-gray-400'),
    # Inner card border-t subtle dividers — bump them up
    ('border-t border-carbon-border/20', 'border-t border-carbon-border/40'),
    # Sub-section border dividers in settings
    ('border-t border-carbon-border/40 pt-4 mt-2', 'border-t border-carbon-border/60 pt-4 mt-2'),
    ('border-t border-carbon-border/40 pt-4 mt-auto', 'border-t border-carbon-border/60 pt-4 mt-auto'),
    # Panel section borders - make them more visible
    ('border-carbon-border/50 pb-6', 'border-carbon-border/80 pb-6'),
    ('border-carbon-border/50 pb-2', 'border-carbon-border/80 pb-2'),
    # Sidebar clip list text
    ('text-gray-500 select-none', 'text-gray-400 select-none'),
    # Timeline lane row label text
    ('font-mono text-xs text-gray-500 font-semibold', 'font-mono text-xs text-gray-300 font-semibold'),
    # Console log area
    ('bg-carbon-card/5 select-none', 'bg-carbon-card/15 select-none'),
    # Video preview section top border bg
    ('bg-carbon-panel/20 p-5 flex flex-col items-center justify-center gap-4 sele',
     'bg-carbon-panel/40 p-5 flex flex-col items-center justify-center gap-4 sele'),
]

total = 0
for old, new in replacements:
    times = content.count(old)
    if times:
        content = content.replace(old, new)
        print(f'  {times}x: {old[:65]}')
        total += times
    else:
        print(f'  SKIP (not found): {old[:65]}')

with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone. Total: {total} replacements')
