import re

def parse_and_validate_jsx(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find function App()
    app_idx = content.find("function App()")
    if app_idx == -1:
        print("Could not find function App()")
        return
        
    length = len(content)
    stack = []
    
    in_string = False
    string_char = None
    in_line_comment = False
    in_block_comment = False
    in_jsx_comment = False
    
    i = app_idx
    
    # We will scan character by character
    while i < length:
        line_num = content[:i].count('\n') + 1
        char = content[i]
        
        # Skip line comments
        if in_line_comment:
            if char == '\n':
                in_line_comment = False
            i += 1
            continue
            
        # Skip block comments
        if in_block_comment:
            if char == '*' and i + 1 < length and content[i+1] == '/':
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue
            
        # Skip JSX comments {/* ... */}
        if in_jsx_comment:
            if char == '*' and i + 2 < length and content[i+1] == '/' and content[i+2] == '}':
                in_jsx_comment = False
                i += 3
                continue
            i += 1
            continue
            
        # Skip normal string literals
        if in_string:
            if char == '\\':
                i += 2
                continue
            if char == string_char:
                in_string = False
            i += 1
            continue
            
        # Check for comments
        if char == '/' and i + 1 < length:
            if content[i+1] == '/':
                in_line_comment = True
                i += 2
                continue
            elif content[i+1] == '*':
                in_block_comment = True
                i += 2
                continue
                
        # Check for JSX comment {/*
        if char == '{' and i + 2 < length and content[i+1] == '/' and content[i+2] == '*':
            in_jsx_comment = True
            i += 3
            continue
            
        # Check for string literals
        if char in ["'", '"', '`']:
            in_string = True
            string_char = char
            i += 1
            continue
            
        # Look for tag opening `<`
        if char == '<':
            # Check if this is a JSX tag opening
            match = re.match(r'^<(/?[a-zA-Z][a-zA-Z0-9_-]*)', content[i:])
            if match:
                tag_full = match.group(0)
                tag_name = match.group(1)
                
                # Scan to find closing `>` of this tag
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
                
                # Check for standard HTML self-closing tags
                tag_name_lower = tag_name.lower()
                if tag_name_lower in ['input', 'img', 'br', 'hr', 'audio', 'video', 'link', 'meta', 'source', 'path', 'circle', 'rect', 'line', 'polygon', 'ellipse']:
                    is_self_closing = True
                    
                if not is_self_closing:
                    if is_closing:
                        if not stack:
                            print(f"[Line {line_num}] Error: Closed </{tag_name}> but stack is empty!")
                            return
                        top_tag, top_line = stack.pop()
                        if top_tag.lower() != tag_name_lower:
                            print(f"[Line {line_num}] Error: Mismatched closing tag </{tag_name}> - expected </{top_tag}> from line {top_line}")
                            # Print stack trace
                            print("Current stack trace:")
                            for t, l in reversed(stack[-5:]):
                                print(f"  <{t}> at line {l}")
                            return
                    else:
                        stack.append((tag_name, line_num))
                        
                i = j
                continue
                
        i += 1
        
    if stack:
        print("Validation Finished: There are unclosed JSX tags:")
        for tag, line in stack:
            print(f"  <{tag}> opened at line {line}")
    else:
        print("Success: All JSX tags are perfectly balanced!")

if __name__ == "__main__":
    parse_and_validate_jsx("d:/Osama_mvp/static/app.js")
