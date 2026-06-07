import os
import sqlite3
import json
from pathlib import Path
import datetime

DB_FILE = Path(__file__).resolve().parent.parent.parent / "autostitch.db"

def get_connection():
    """Returns a connection to the local SQLite database."""
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row  # Enables accessing columns by name
    return conn

def init_db():
    """Creates the tables and indexes if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Projects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        project_name TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        manifest_json TEXT NOT NULL
    )
    """)

    # 4. Character Library table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS character_library (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image_path TEXT NOT NULL,
        chars_json TEXT NOT NULL
    )
    """)
    
    # 2. Generation History table (for SFX and TTS prompts auditing)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS generation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        block_id TEXT NOT NULL,
        block_type TEXT NOT NULL,
        prompt TEXT NOT NULL,
        output_path TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # 3. Render History table (logs video stitches)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS render_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        concat_master INTEGER DEFAULT 1,
        output_path TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # Create indexes for instant lookups
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_gen_project ON generation_history(project_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_render_project ON render_history(project_name)")
    
    conn.commit()
    conn.close()

def save_project(project_name: str, manifest_dict: dict):
    """Inserts or replaces a project manifest in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    
    now_str = datetime.datetime.now().isoformat()
    manifest_json = json.dumps(manifest_dict)
    
    # Check if project exists to preserve created_at
    cursor.execute("SELECT created_at FROM projects WHERE project_name = ?", (project_name,))
    row = cursor.fetchone()
    
    if row:
        created_at = row['created_at']
    else:
        created_at = now_str
        
    cursor.execute("""
    INSERT OR REPLACE INTO projects (project_name, created_at, updated_at, manifest_json)
    VALUES (?, ?, ?, ?)
    """, (project_name, created_at, now_str, manifest_json))
    
    conn.commit()
    conn.close()

def get_project(project_name: str) -> dict or None:
    """Retrieves and parses a project manifest from SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT manifest_json FROM projects WHERE project_name = ?", (project_name,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        try:
            return json.loads(row['manifest_json'])
        except Exception:
            return None
    return None

def list_projects() -> list:
    """Lists all projects with their update metadata."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT project_name, created_at, updated_at, manifest_json FROM projects ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    projects_list = []
    for r in rows:
        d = dict(r)
        manifest_json = d.pop('manifest_json', '{}')
        try:
            manifest_dict = json.loads(manifest_json)
            # count clips
            video_blocks = manifest_dict.get('video_blocks', [])
            d['clips_count'] = len(video_blocks)
            # sum duration
            total_duration = sum(float(b.get('duration_s', 0.0)) for b in video_blocks)
            d['duration_s'] = round(total_duration, 1)
            # status
            d['render_complete'] = manifest_dict.get('render_complete', False)
        except Exception:
            d['clips_count'] = 0
            d['duration_s'] = 0.0
            d['render_complete'] = False
        projects_list.append(d)
    return projects_list

def log_generation(project_name: str, block_id: str, block_type: str, prompt: str, path: str, status: str):
    """Logs an AI generation audit trail in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    
    now_str = datetime.datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO generation_history (project_name, block_id, block_type, prompt, output_path, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (project_name, block_id, block_type, prompt, path, status, now_str))
    
    conn.commit()
    conn.close()

def log_render(project_name: str, concat_master: bool, path: str, status: str):
    """Logs a video render/stitch operation in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    
    now_str = datetime.datetime.now().isoformat()
    concat_val = 1 if concat_master else 0
    cursor.execute("""
    INSERT INTO render_history (project_name, concat_master, output_path, status, created_at)
    VALUES (?, ?, ?, ?, ?)
    """, (project_name, concat_val, path, status, now_str))
    
    conn.commit()
    conn.close()

def get_generation_history(limit: int = 100) -> list:
    """Retrieves recent AI generations history log."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT id, project_name, block_id, block_type, prompt, output_path, status, created_at
    FROM generation_history 
    ORDER BY id DESC 
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]

def get_render_history(limit: int = 50) -> list:
    """Retrieves recent video rendering exports log."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT id, project_name, concat_master, output_path, status, created_at
    FROM render_history 
    ORDER BY id DESC 
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in rows]


def save_character_profile(profile: dict):
    """Inserts or replaces a character profile in the library."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO character_library (id, name, image_path, chars_json)
    VALUES (?, ?, ?, ?)
    """, (profile["id"], profile["name"], profile["image_path"], json.dumps(profile["chars"])))
    conn.commit()
    conn.close()


def get_character_profiles() -> list:
    """Retrieves all character profiles in the library."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image_path, chars_json FROM character_library ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    
    profiles = []
    for r in rows:
        d = dict(r)
        d["chars"] = json.loads(d.pop("chars_json"))
        profiles.append(d)
    return profiles


def delete_character_profile(profile_id: str):
    """Deletes a character profile from the library."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM character_library WHERE id = ?", (profile_id,))
    conn.commit()
    conn.close()
