import ast

with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    node = ast.parse(f.read())

classes = []
functions = []
routes = []

for item in node.body:
    if isinstance(item, ast.ClassDef):
        classes.append(item.name)
    elif isinstance(item, ast.FunctionDef):
        # check if it has decorators for routes
        is_route = False
        route_info = ""
        for dec in item.decorator_list:
            if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.func.value.id == "app":
                is_route = True
                args = [ast.unparse(arg) for arg in dec.args]
                route_info = f"@{dec.func.value.id}.{dec.func.attr}({', '.join(args)})"
        if is_route:
            routes.append((route_info, item.name))
        else:
            functions.append(item.name)

print("Classes:")
for c in classes:
    print(f"- {c}")

print("\nFunctions:")
for f in functions:
    print(f"- {f}")

print("\nRoutes:")
for r in routes:
    print(f"- {r[0]} def {r[1]}()")
