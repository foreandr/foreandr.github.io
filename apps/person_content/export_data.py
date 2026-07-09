import json
import re
import sqlite3
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse, parse_qs

DB_PATH = Path(__file__).with_name("person_content.db")
OUTPUT_PATH = Path(__file__).with_name("person_content_data.json")


def _extract_youtube_id(url):
    if not url:
        return ""
    text = str(url).strip()
    parsed = urlparse(text)
    if parsed.netloc.endswith("youtube.com"):
        if parsed.path.startswith("/watch"):
            return parse_qs(parsed.query).get("v", [""])[0]
        if parsed.path.startswith("/shorts/"):
            return parsed.path.split("/")[-1]
        if parsed.path.startswith("/embed/"):
            return parsed.path.split("/")[-1]
    if parsed.netloc.endswith("youtu.be"):
        return parsed.path.lstrip("/").split("/")[0]
    return ""


def _top_words(text, limit=10):
    if not text:
        return []
    words = re.findall(r"[a-zA-Z']+", text.lower())
    stop_words = {
        "the",
        "and",
        "of",
        "to",
        "a",
        "in",
        "is",
        "it",
        "that",
        "for",
        "on",
        "this",
        "with",
        "are",
        "was",
        "be",
        "we",
        "you",
        "i",
        "they",
        "our",
        "their",
        "have",
        "has",
        "had",
        "but",
        "what",
        "can",
        "an",
        "as",
        "if",
        "or",
        "do",
        "does",
        "did",
        "from",
        "all",
        "at",
    }
    filtered = [word for word in words if len(word) > 2 and word not in stop_words]
    counts = Counter(filtered)
    return [{"word": word, "count": count} for word, count in counts.most_common(limit)]


def write_export_json(db_path=DB_PATH, output_path=OUTPUT_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        videos = []
        for row in conn.execute(
            "SELECT id, title, url, transcript, channel_id FROM videos ORDER BY id"
        ):
            people_rows = []
            for person_row in conn.execute(
                "SELECT person_id FROM video_people WHERE video_id = ? ORDER BY person_id",
                (row["id"],),
            ):
                person_name = conn.execute(
                    "SELECT name FROM people WHERE id = ?",
                    (person_row["person_id"],),
                ).fetchone()
                if person_name:
                    people_rows.append(
                        {
                            "person_id": person_row["person_id"],
                            "name": person_name[0],
                        }
                    )

            channel_row = conn.execute(
                "SELECT url, title, owner_person_id FROM channels WHERE id = ?",
                (row["channel_id"],),
            ).fetchone()
            owner_name = None
            if channel_row and channel_row["owner_person_id"] is not None:
                owner_name_row = conn.execute(
                    "SELECT name FROM people WHERE id = ?",
                    (channel_row["owner_person_id"],),
                ).fetchone()
                if owner_name_row:
                    owner_name = owner_name_row[0]

            transcript_text = row["transcript"] or ""
            video = {
                "id": row["id"],
                "title": row["title"],
                "url": row["url"],
                "youtube_id": _extract_youtube_id(row["url"]),
                "channel": {
                    "id": row["channel_id"],
                    "url": channel_row["url"] if channel_row else None,
                    "title": channel_row["title"] if channel_row else None,
                    "owner_name": owner_name,
                },
                "people": people_rows,
                "top_words": _top_words(transcript_text, limit=10),
                "search_text": " ".join([row["title"], owner_name or "", *[person["name"] for person in people_rows]]).lower(),
            }
            videos.append(video)

        people = []
        for row in conn.execute("SELECT id, name FROM people ORDER BY name"):
            people.append({"id": row["id"], "name": row["name"]})

        payload = {
            "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "videos": videos,
            "people": people,
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return payload
    finally:
        conn.close()


def main():
    payload = write_export_json()
    print(json.dumps({"videos": len(payload["videos"]), "people": len(payload["people"]), "output": str(OUTPUT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
