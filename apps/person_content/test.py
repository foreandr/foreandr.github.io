import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("person_content.db")


def load_data(limit=10):
    if not DB_PATH.exists():
        print(f"Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        videos = []
        for row in conn.execute("SELECT id, title, url, transcript FROM videos ORDER BY id LIMIT ?", (limit,)):
            people_rows = [
                {
                    "person_id": person_row["person_id"],
                    "name": conn.execute("SELECT name FROM people WHERE id = ?", (person_row["person_id"],)).fetchone()[0],
                }
                for person_row in conn.execute(
                    "SELECT person_id FROM video_people WHERE video_id = ? ORDER BY person_id",
                    (row["id"],),
                )
            ]
            videos.append(
                {
                    "id": row["id"],
                    "title": row["title"],
                    "url": row["url"],
                    "transcript_length": len(row["transcript"] or ""),
                    "people": people_rows,
                }
            )
    finally:
        conn.close()

    return {
        "videos": videos,
        "note": f"Showing first {limit} videos. Change the limit in test.py if you want more.",
    }


def main():
    data = load_data(limit=10)
    if not data:
        return

    print(json.dumps(data, indent=2, default=str))


if __name__ == "__main__":
    main()
