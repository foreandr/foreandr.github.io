import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from export_data import write_export_json


class ExportDataTests(unittest.TestCase):
    def test_writes_json_with_people_and_top_words(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            db_path = tmpdir_path / "test_person_content.db"
            output_path = tmpdir_path / "data.json"

            conn = sqlite3.connect(db_path)
            try:
                conn.executescript(
                    """
                    CREATE TABLE people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
                    CREATE TABLE channels (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL UNIQUE, title TEXT, owner_person_id INTEGER);
                    CREATE TABLE videos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE, transcript TEXT, channel_id INTEGER NOT NULL);
                    CREATE TABLE video_people (video_id INTEGER NOT NULL, person_id INTEGER NOT NULL, PRIMARY KEY (video_id, person_id));
                    """
                )
                conn.execute("INSERT INTO people (name) VALUES (?)", ("Alice",))
                conn.execute("INSERT INTO people (name) VALUES (?)", ("Bob",))
                conn.execute("INSERT INTO channels (url, title, owner_person_id) VALUES (?, ?, ?)", ("https://example.com/channel", "Example", 1))
                conn.execute(
                    "INSERT INTO videos (title, url, transcript, channel_id) VALUES (?, ?, ?, ?)",
                    (
                        "Alice and Bob Talk",
                        "https://www.youtube.com/watch?v=abc12345678",
                        "Alice and Bob talked about Alice and Bob and their plans.",
                        1,
                    ),
                )
                conn.execute("INSERT INTO video_people (video_id, person_id) VALUES (?, ?)", (1, 1))
                conn.execute("INSERT INTO video_people (video_id, person_id) VALUES (?, ?)", (1, 2))
                conn.commit()
            finally:
                conn.close()

            written = write_export_json(db_path=db_path, output_path=output_path)
            self.assertTrue(output_path.exists())
            self.assertEqual(written["videos"][0]["youtube_id"], "abc12345678")
            self.assertEqual(len(written["videos"][0]["people"]), 2)
            self.assertTrue(any(item["word"] == "alice" for item in written["videos"][0]["top_words"]))
            self.assertIn("alice", written["videos"][0]["search_text"].lower())


if __name__ == "__main__":
    unittest.main()
