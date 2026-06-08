content = open('D:/Osama_mvp/autostitch-landing.html', encoding='utf-8').read()
lines = content.splitlines()

def print_around(line_num):
    print(f"=== Around line {line_num} ===")
    for idx in range(max(0, line_num-5), min(len(lines), line_num+10)):
        print(f"  {idx+1}: {lines[idx][:150]}")

print_around(472)
print_around(751)
