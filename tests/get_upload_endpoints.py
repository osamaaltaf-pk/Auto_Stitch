import ast

with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    code = f.read()

node = ast.parse(code)
lines = code.split("\n")
extracted = {}

target_routes = [
    "proxy_lipsync_serve_image", # wait, is it proxy or direct? In standalone app.py it's direct!
    "serve_image",
    "upload_file",
    "upload_folder"
]

# Let's search for function definitions matching these or having routing decorators
for item in node.body:
    if isinstance(item, ast.FunctionDef):
        is_target = item.name in target_routes
        for dec in item.decorator_list:
            if isinstance(dec, ast.Call) and "/api/upload" in ast.unparse(dec) or "serve-image" in ast.unparse(dec):
                is_target = True
        if is_target:
            start = item.lineno - 1
            end = getattr(item, "end_lineno", start + 1)
            src = "\n".join(lines[start:end])
            extracted[item.name] = src

print("Extracted upload functions:")
for k in extracted:
    print(f"- {k}")
    print(extracted[k][:200] + "...")
    print("="*40)
