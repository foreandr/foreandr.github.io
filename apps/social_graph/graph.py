import sqlite3
import json
import os
from itertools import combinations

def export_combat_social_graph(db_name="combat_vault.db", js_filename="combat_data.js"):
    """
    Creates a Fighter-to-Fighter graph. 
    Uses 'var' to allow the frontend to reload different datasets.
    """
    if not os.path.exists(db_name):
        return

    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = '''
        SELECT 
            pic.post_id, 
            p.person_name, 
            c.title
        FROM people_in_content pic
        JOIN people p ON pic.person_id = p.person_id
        JOIN content c ON pic.post_id = c.post_id
        WHERE pic.post_id IN (
            SELECT post_id 
            FROM people_in_content 
            GROUP BY post_id 
            HAVING COUNT(person_id) > 1
        )
    '''
    
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    video_map = {}
    for row in rows:
        pid = row['post_id']
        if pid not in video_map:
            video_map[pid] = {'title': row['title'], 'people': []}
        video_map[pid]['people'].append(row['person_name'])

    unique_nodes = set()
    edges = []

    for pid, data in video_map.items():
        people = sorted(data['people'])
        for pair in combinations(people, 2):
            unique_nodes.add(pair[0])
            unique_nodes.add(pair[1])
            edges.append({
                "from": pair[0],
                "to": pair[1],
                "title": data['title'],
                "post_id": pid
            })

    nodes = [{"id": n, "label": n} for n in unique_nodes]

    try:
        with open(js_filename, 'w', encoding='utf-8') as f:
            # CHANGED: 'var' instead of 'const' to prevent JS Identifier Errors
            f.write("var networkData = ")
            json.dump({"nodes": nodes, "edges": edges}, f, indent=4)
            f.write(";")
        print(f"Graph Exported: {len(nodes)} nodes, {len(edges)} edges.")
    except Exception as e:
        print(f"Error: {e}")

def export_to_visjs(db_name="youtube_vault.db", js_filename="podcast_data.js"):
    if not os.path.exists(db_name):
        return

    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    query = '''
        SELECT 
            p_owner.person_name AS owner,
            p_tagged.person_name AS guest,
            con.title,
            con.post_id
        FROM content con
        JOIN channels c ON con.channel_id = c.channel_id
        JOIN people p_owner ON c.channel_owner_id = p_owner.person_id
        JOIN people_in_content pic ON con.post_id = pic.post_id
        JOIN people p_tagged ON pic.person_id = p_tagged.person_id
        WHERE p_owner.person_name != p_tagged.person_name
    '''
    
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    unique_nodes = set()
    edges = []

    for row in rows:
        unique_nodes.add(row['owner'])
        unique_nodes.add(row['guest'])
        edges.append({
            "from": row['owner'],
            "to": row['guest'],
            "title": row['title'],
            "post_id": row['post_id']
        })

    nodes = [{"id": n, "label": n} for n in unique_nodes]

    try:
        with open(js_filename, 'w', encoding='utf-8') as f:
            # CHANGED: 'var' instead of 'const' to prevent JS Identifier Errors
            f.write("var networkData = ")
            json.dump({"nodes": nodes, "edges": edges}, f, indent=4)
            f.write(";")
        print(f"File created: {js_filename}")
    except Exception as e:
        print(f"Error: {e}")