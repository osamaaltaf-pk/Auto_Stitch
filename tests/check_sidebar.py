import re

def check_sidebar_range(file_path, start_line, end_line):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    sidebar_lines = lines[start_line-1:end_line]
    content = "".join(sidebar_lines)
    
    stack = []
    length = len(content)
    i = 0
    
    in_string = False
    string_char = None
    in_line_comment = False
    in_block_comment = False
    in_jsx_comment = False
    
    while i < length:
        line_num = content[:i].count('\n') + start_line
        char = content[i]
        
        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            i += 1
            continue
            
        if in_block_comment:
            if char == '*' and i + 1 < length and content[i+1] == '/':
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue
            
        if in_jsx_comment:
            if char == '*' and i + 2 < length and content[i+1] == '/' and content[i+2] == '}':
                in_jsx_comment = False
                i += 3
                continue
            i += 1
            continue
            
        if in_string:
            if char == '\\':
                i += 2
                continue
            if char == string_char:
                in_string = False
            i += 1
            continue
            
        if char == '/' and i + 1 < length:
            if content[i+1] == '/':
                in_line_comment = True
                i += 2
                continue
            elif content[i+1] == '*':
                in_block_comment = True
                i += 2
                continue
                
        if char == '{' and i + 2 < length and content[i+1] == '/' and content[i+2] == '*':
            in_jsx_comment = True
            i += 3
            continue
            
        if char in ["'", '"', '`']:
            in_string = True
            string_char = char
            i += 1
            continue
            
        if char == '<':
            match = re.match(r'^<(/?[a-zA-Z][a-zA-Z0-9_-]*)', content[i:])
            if match:
                tag_full = match.group(0)
                tag_name = match.group(1)
                
                j = i + len(tag_full)
                tag_in_string = False
                tag_string_char = None
                brace_depth = 0
                is_self_closing = False
                
                while j < length:
                    c = content[j]
                    if tag_in_string:
                        if c == '\\':
                            j += 2
                            continue
                        if c == tag_string_char:
                            tag_in_string = False
                        j += 1
                        continue
                    if c in ['"', "'", '`']:
                        tag_in_string = True
                        tag_string_char = c
                        j += 1
                        continue
                    if c == '{':
                        brace_depth += 1
                        j += 1
                        continue
                    if c == '}':
                        brace_depth -= 1
                        j += 1
                        continue
                    if brace_depth == 0:
                        if c == '/' and j + 1 < length and content[j+1] == '>':
                            is_self_closing = True
                            j += 2
                            break
                        if c == '>':
                            j += 1
                            break
                    j += 1
                
                is_closing = tag_name.startswith('/')
                if is_closing:
                    tag_name = tag_name[1:]
                
                tag_name_lower = tag_name.lower()
                if tag_name_lower in ['input', 'img', 'br', 'hr', 'audio', 'video', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'line', 'polygon', 'ellipse']:
                    is_self_closing = True
                    
                if not is_self_closing:
                    if is_closing:
                        if not stack:
                            print(f"[Line {line_num}] Closed </{tag_name}> but stack is empty!")
                        else:
                            top_tag, top_line = stack.pop()
                            print(f"[Line {line_num}] Closed </{tag_name}> (matched <{top_tag}> from line {top_line})")
                    else:
                        stack.append((tag_name, line_num))
                        print(f"[Line {line_num}] Opened <{tag_name}>")
                        
                i = j
                continue
                
        i += 1
        
    print("\n--- Final Stack ---")
    for t, l in stack:
        print(f"<{t}> opened at line {l}")

if __name__ == "__main__":
    check_sidebar_range("d:/Osama_mvp/static/app.js", 2226, 2507)
