import sqlite3
import json
from pathlib import Path

db_path = Path("autostitch.db")
dest_dir = Path("lip_sync_standalone/projects/characters")
dest_dir.mkdir(parents=True, exist_ok=True)
dest_file = dest_dir / "character_library_profiles.json"

if db_path.exists():
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='character_library'")
        if cursor.fetchone():
            cursor.execute("SELECT id, name, image_path, chars_json FROM character_library")
            rows = cursor.fetchall()
            profiles = []
            for r in rows:
                profiles.append({
                    "id": r[0],
                    "name": r[1],
                    "image_path": r[2],
                    "chars": json.loads(r[3])
                })
            
            with open(dest_file, "w", encoding="utf-8") as f:
                json.dump(profiles, f, indent=2)
            print(f"Successfully migrated {len(profiles)} character profiles to {dest_file}")
            
            # Now drop the table from autostitch.db to clean it up
            cursor.execute("DROP TABLE character_library")
            conn.commit()
            print("Dropped 'character_library' table from autostitch.db to clean it up.")
        else:
            print("Table 'character_library' not found in autostitch.db.")
        conn.close()
    except Exception as e:
        print(f"Error during migration: {e}")
else:
    print("autostitch.db not found.")
