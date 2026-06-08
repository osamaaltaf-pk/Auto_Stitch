import re

with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    code = f.read()

# Let's find each class that inherits from BaseModel
classes = re.findall(r"class \w+\(BaseModel\):.*?(?=\n\n\w|\Z)", code, re.DOTALL)
print(f"Found {len(classes)} classes:")
for c in classes:
    print(c)
    print("="*40)
