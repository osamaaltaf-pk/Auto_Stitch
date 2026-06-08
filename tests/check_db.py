import sqlite3
import json

try:
    conn = sqlite3.connect('autostitch.db')
    cursor = conn.cursor()
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='character_library'")
    if cursor.fetchone():
        cursor.execute("SELECT id, name, image_path, chars_json FROM character_library")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} character library profiles:")
        for r in rows:
            print(f"- {r[1]} (ID: {r[0]}, Image: {r[2]})")
            print(f"  Data: {r[3][:100]}...")
    else:
        print("Table 'character_library' does not exist.")
    conn.close()
except Exception as e:
    print(f"Error querying database: {e}")
