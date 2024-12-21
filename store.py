# store.py

import json
from db import get_connection

def get_recipe_from_db(url):
    """Return (transcript, recipe_dict) if found, else (None, None)."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT transcript, recipe_json FROM recipe_cache WHERE url = %s;", (url,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        transcript = row[0]
        if isinstance(row[1], dict):
            recipe_dict = row[1]
        else:
            recipe_dict = json.loads(row[1])
        return transcript, recipe_dict

    return None, None

def store_recipe_in_db(url, transcript, recipe_dict):
    """Insert or update the recipe_cache row."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO recipe_cache (url, transcript, recipe_json, updated_at)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (url)
        DO UPDATE SET
          transcript = EXCLUDED.transcript,
          recipe_json = EXCLUDED.recipe_json,
          updated_at = EXCLUDED.updated_at;
    ''', (url, transcript, json.dumps(recipe_dict)))
    conn.commit()
    cur.close()
    conn.close()
