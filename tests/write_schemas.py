import ast

with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    code = f.read()

node = ast.parse(code)
schemas_code = []

# List of classes we want to extract
target_classes = [
    "LicenseActivateRequest",
    "CharacterConfig",
    "LipSyncRequest",
    "ColorSampleRequest",
    "SelectSmoothingRequest",
    "SaveDatasetRequest",
    "TrackVideoRequest",
    "RhubarbRunRequest",
    "PropagateRequest"
]

# Get lines for each class
lines = code.split("\n")
extracted = {}

for item in node.body:
    if isinstance(item, ast.ClassDef) and item.name in target_classes:
        # get source lines
        start = item.lineno - 1
        # AST lineno is 1-based. Find end line.
        # We can find it by looking at item.end_lineno if python >= 3.8
        end = getattr(item, "end_lineno", start + 1)
        src = "\n".join(lines[start:end])
        extracted[item.name] = src

# Write them out with necessary imports
out_path = "lip_sync_standalone/app/models/schemas.py"
with open(out_path, "w", encoding="utf-8") as out:
    out.write("from pydantic import BaseModel\n")
    out.write("from typing import List, Dict, Any, Optional\n\n")
    for name in target_classes:
        if name in extracted:
            out.write(extracted[name])
            out.write("\n\n")
        else:
            print(f"Warning: {name} not found in app.py")

print("schemas.py written successfully.")
