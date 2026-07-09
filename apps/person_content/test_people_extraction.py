import unittest
import sys
import sqlite3
import tempfile
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import main


class PersonExtractionTests(unittest.TestCase):
    def test_extracts_human_names_from_sentence(self):
        people = main.extract_people_from_text("Alice and Bob discussed the plan with Carol.")
        self.assertTrue(any(name.lower() == "alice" for name in people))
        self.assertTrue(any(name.lower() == "bob" for name in people))
        self.assertTrue(any(name.lower() == "carol" for name in people))

    def test_ignores_non_person_nouns(self):
        people = main.extract_people_from_text("The meeting was held in the city at noon.")
        self.assertEqual(people, [])

    def test_ignores_title_fragments_like_war_and_empire(self):
        people = main.extract_people_from_text("Norman Finkelstein: Trump, Netanyahu, Putin, and the War in Iran")
        self.assertNotIn("War", people)
        self.assertNotIn("Empire", people)
        self.assertTrue(any(name.lower() == "norman finkelstein" for name in people))

    def test_ownerless_channel_links_extracted_people_without_fake_owner(self):
        original_db_path = main.DB_PATH
        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                main.DB_PATH = Path(tmpdir) / "person_content.db"
                main.initialize_database()

                with mock.patch.object(
                    main,
                    "get_channel_videos",
                    return_value=[{"title": "Alan Stern on Pluto", "url": "https://www.youtube.com/watch?v=abc12345678"}],
                ), mock.patch.object(main, "extract_people_from_text", return_value=["Alan Stern"]):
                    channel_id, owner_id, video_count = main.process_channel(None, "https://www.youtube.com/@videosfromIAS")

                conn = sqlite3.connect(main.DB_PATH)
                try:
                    people = [row[0] for row in conn.execute("SELECT name FROM people ORDER BY name")]
                    channel_owner = conn.execute(
                        "SELECT owner_person_id FROM channels WHERE id = ?",
                        (channel_id,),
                    ).fetchone()[0]
                    linked_people = [
                        row[0]
                        for row in conn.execute(
                            """
                            SELECT people.name
                            FROM video_people
                            JOIN people ON people.id = video_people.person_id
                            ORDER BY people.name
                            """
                        )
                    ]
                finally:
                    conn.close()
            finally:
                main.DB_PATH = original_db_path

            self.assertIsNone(owner_id)
            self.assertIsNone(channel_owner)
            self.assertEqual(video_count, 1)
            self.assertEqual(people, ["Alan Stern"])
            self.assertEqual(linked_people, ["Alan Stern"])


if __name__ == "__main__":
    unittest.main()
