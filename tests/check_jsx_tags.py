import re

def check_jsx(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    stack = []
    
    # We will search for tags strictly from line 3100 to 3600 (1-indexed)
    timeline_lines = lines[3099:3600]
    
    for idx, line in enumerate(timeline_lines):
        line_num = 3100 + idx
        # Remove comments
        line = re.sub(r'{/\*.*?\*/}', '', line)
        line = re.sub(r'//.*', '', line)
        
        # Find tags using regex
        for match in re.finditer(r'<(/?[a-zA-Z0-9_:-]+)([^>]*?)(/?)>', line):
            full = match.group(0)
            tag = match.group(1)
            is_closing = tag.startswith('/')
            is_self_closing = match.group(3) == '/'
            
            if is_closing:
                tag_name = tag[1:]
            else:
                tag_name = tag
                
            # Ignore standard HTML self-closing elements
            if tag_name in ['input', 'img', 'br', 'hr', 'audio', 'video'] and not is_closing:
                if is_self_closing or 'src=' in match.group(2) or match.group(3) == '/':
                    is_self_closing = True
                
            # Ignore self-closing Icon
            if tag_name in ['Icon'] and not is_closing:
                is_self_closing = True
                
            if is_self_closing:
                continue
                
            if is_closing:
                if not stack:
                    print(f"Line {line_num}: Error - Closing tag </{tag_name}> with empty stack")
                    return False
                top_tag, top_line = stack.pop()
                if top_tag != tag_name:
                    print(f"Line {line_num}: Error - Mismatched tag: closed </{tag_name}> but expected </{top_tag}> from line {top_line}")
                    return False
            else:
                stack.append((tag_name, line_num))
                
    if stack:
        print(f"Unclosed tags at the end of timeline container:")
        for tag, line in stack:
            print(f"<{tag}> opened at line {line}")
        return False
        
    print("JSX tags in timeline container are perfectly balanced!")
    return True

check_jsx('static/app.js')
