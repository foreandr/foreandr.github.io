import csv
import json
import os

def build():
    manga_list = []
    tag_to_ids = {}
    
    # 1. Load Manga (The metadata)
    with open('data/manga.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            manga_list.append({
                "id": row['id'],
                "c": row['cover_url'],
                "l": row['language']
            })
    
    # 2. Load Tags (The junction map)
    with open('data/manga_tags.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            m_id, tag = row['manga_id'], row['tag_slug']
            if tag not in tag_to_ids:
                tag_to_ids[tag] = []
            tag_to_ids[tag].append(m_id)

    # 3. Spit out db.js with the ALL_TAGS key
    with open('../db.js', 'w', encoding='utf-8') as f:
        f.write(f"window.MANGA_DB = {json.dumps(manga_list)};\n")
        f.write(f"window.TAG_MAP = {json.dumps(tag_to_ids)};\n")
        # THIS LINE is what makes the search bar work:
        f.write(f"window.ALL_TAGS = {json.dumps(list(tag_to_ids.keys()))};\n")
        
    print(f"Baking complete. Prepared {len(manga_list)} items and {len(tag_to_ids)} tags.")

if __name__ == "__main__":
    build()