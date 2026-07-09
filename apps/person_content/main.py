import os
import re
import sqlite3
import tempfile
from pathlib import Path
from urllib.parse import urlparse

try:
    import nltk
    from nltk.chunk import ne_chunk
    from nltk.corpus import names as nltk_names
    from nltk.tag import pos_tag
    from nltk.tokenize import sent_tokenize, word_tokenize
except Exception:
    nltk = None
    ne_chunk = None
    nltk_names = None
    pos_tag = None
    sent_tokenize = None
    word_tokenize = None

DB_PATH = Path(__file__).with_name("person_content.db")


def _safe_text(value):
    """Return a cleaned string value or an empty string."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value)


class _SilentYtdlpLogger:
    """Swallow yt-dlp extractor noise that is handled by fallback logic."""

    def debug(self, message):
        pass

    def warning(self, message):
        pass

    def error(self, message):
        pass


def _ensure_nltk_resources():
    """Download the small NLTK resources needed for fast name extraction when available."""
    if nltk is None or ne_chunk is None or pos_tag is None or sent_tokenize is None or word_tokenize is None:
        return False

    resources = [
        "tokenizers/punkt",
        "taggers/averaged_perceptron_tagger",
        "chunkers/maxent_ne_chunker",
        "corpora/words",
        "corpora/names",
    ]

    for resource in resources:
        try:
            nltk.data.find(resource)
        except LookupError:
            try:
                nltk.download(resource.split("/")[-1], quiet=True)
            except Exception:
                return False

    return True


def _known_person_names():
    """Return a set of common first names from NLTK when available."""
    if nltk_names is None:
        return set()
    try:
        return {word.lower() for word in nltk_names.words()}
    except Exception:
        return set()


def _looks_like_title(text):
    """Return True for short title-like strings that should not generate loose person tags."""
    text = _safe_text(text)
    if not text:
        return False
    if ":" in text:
        return True

    words = [word.strip(" ,;:!?().") for word in re.split(r"\s+", text) if word.strip(" ,;:!?().")]
    if not words:
        return False
    if len(words) > 8:
        return False

    title_case_count = sum(1 for word in words if re.match(r"^[A-Z][a-zA-Z'-]*$", word))
    lowercase_stopwords = {"and", "the", "of", "for", "with", "in", "on", "to", "a", "an", "is", "are", "was", "were", "be", "this", "that", "how", "what", "did", "do", "discussed", "discuss", "talked", "about"}
    has_sentence_like_words = any(word.lower() in lowercase_stopwords for word in words)
    return title_case_count >= 2 and not has_sentence_like_words


def _looks_like_human_name(candidate, context_text=""):
    """Return True when a candidate looks like a human name rather than a common noun."""
    candidate = _safe_text(candidate)
    if not candidate or len(candidate) < 2:
        return False
    if candidate.isupper() or candidate.islower():
        return False
    if len(candidate.split()) > 3:
        return False
    if re.fullmatch(r"[A-Za-z]+(?:['-][A-Za-z]+)?(?:\s+[A-Za-z]+(?:['-][A-Za-z]+)?)*", candidate) is None:
        return False

    words = candidate.split()
    known_names = _known_person_names()
    banned_words = {
        "the",
        "and",
        "for",
        "with",
        "this",
        "that",
        "meeting",
        "video",
        "youtube",
        "ai",
        "iran",
        "israel",
        "trump",
        "netanyahu",
        "putin",
        "war",
        "world",
        "end",
        "empire",
        "american",
        "third",
        "ii",
        "iii",
        "will",
        "kill",
        "don",
        "dont",
        "we",
        "us",
        "all",
        "if",
        "change",
        "course",
        "dont",
    }

    if len(words) == 1:
        if _looks_like_title(context_text):
            return False
        return words[0].lower() in known_names and words[0].lower() not in banned_words

    if len(words) >= 2:
        if any(word.lower() in banned_words for word in words):
            return False
        if not all(word[0].isupper() for word in words if word):
            return False
        if len(words) == 2:
            first_word = words[0].lower()
            second_word = words[-1].lower()
            if first_word in known_names and second_word in known_names:
                return True
            if first_word in known_names or second_word in known_names:
                return first_word not in {"we", "will", "don", "dont"} and second_word not in {"we", "will", "don", "dont"}
            return False
        if len(words) == 3:
            return False
        return False

    return False


def _fallback_name_extraction(text):
    """Extract simple title-cased name candidates only when they look highly like human names."""
    cleaned = re.sub(r"[^A-Za-z\s'-]", " ", _safe_text(text))
    tokens = [token for token in re.split(r"\s+", cleaned) if token]
    names = []

    for index, token in enumerate(tokens):
        token = token.strip("' -")
        if not token or not token[0].isupper():
            continue
        if len(token) < 2:
            continue
        if token.lower() in {"the", "and", "for", "with", "this", "that"}:
            continue
        if index + 1 < len(tokens):
            next_token = tokens[index + 1].strip("' -")
            if next_token and next_token[0].isupper() and _looks_like_human_name(f"{token} {next_token}", text):
                names.append(f"{token} {next_token}")
                continue
        if _looks_like_human_name(token, text):
            names.append(token)

    return names


def extract_people_from_text(text):
    """Extract likely human names from a sentence or document using NLTK NER when available."""
    text = _safe_text(text)
    if not text:
        return []

    names = set()
    if _ensure_nltk_resources():
        try:
            for sentence in sent_tokenize(text):
                tokens = word_tokenize(sentence)
                if len(tokens) < 2:
                    continue
                tagged = pos_tag(tokens)
                tree = ne_chunk(tagged, binary=False)
                for node in tree:
                    if hasattr(node, "label") and node.label() == "PERSON":
                        candidate = " ".join(word for word, _ in node.leaves())
                        if _looks_like_human_name(candidate, sentence):
                            names.add(candidate)
        except Exception:
            pass

    if names:
        return sorted(names)

    return sorted({name for name in _fallback_name_extraction(text) if _looks_like_human_name(name)})


def initialize_database():
    """Create the SQLite database and schema if it does not already exist."""
    if DB_PATH.exists():
        print(f"Database already exists: {DB_PATH}")
    else:
        print(f"Created database: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()

        def ensure_column(table_name, column_name, column_definition):
            columns = [row[1] for row in cursor.execute(f"PRAGMA table_info({table_name})")]
            if column_name not in columns:
                cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        ensure_column("people", "updated_at", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ensure_column("people", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                title TEXT,
                owner_person_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_person_id) REFERENCES people (id)
            )
            """
        )
        ensure_column("channels", "owner_person_id", "owner_person_id INTEGER")
        ensure_column("channels", "title", "title TEXT")
        ensure_column("channels", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ensure_column("channels", "updated_at", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                transcript TEXT,
                channel_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels (id)
            )
            """
        )
        ensure_column("videos", "channel_id", "channel_id INTEGER")
        ensure_column("videos", "transcript", "transcript TEXT")
        ensure_column("videos", "transcript_attempted_at", "transcript_attempted_at TIMESTAMP")
        ensure_column("videos", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ensure_column("videos", "updated_at", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS video_people (
                video_id INTEGER NOT NULL,
                person_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (video_id, person_id),
                FOREIGN KEY (video_id) REFERENCES videos (id),
                FOREIGN KEY (person_id) REFERENCES people (id)
            )
            """
        )
        ensure_column("video_people", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ensure_column("video_people", "updated_at", "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

        conn.commit()
    finally:
        conn.close()

    return DB_PATH


def infer_owner_name_from_channel_url(channel_url):
    """Infer a likely owner name from a YouTube-style channel URL."""
    parsed = urlparse(channel_url)
    path = parsed.path.strip("/")

    if path.startswith("@"):
        return path[1:]
    if path:
        return path.replace("-", " ").replace("_", " ")
    return "unknown_owner"


def _is_ownerless_channel(owner_name):
    """Return True when a channel spec intentionally has no owning person."""
    if owner_name is None:
        return True
    return _safe_text(owner_name).lower() in {"none", "no owner", "nobody", "ownerless"}


def _normalize_channel_url(channel_url):
    """Normalize channel URLs enough to detect repeated specs."""
    return _safe_text(channel_url).rstrip("/")


def _owner_label(owner_names):
    """Return a compact display label for one or more owners."""
    names = [_safe_text(name) for name in owner_names if not _is_ownerless_channel(name)]
    return ", ".join(names) if names else "None"


def _dedupe_channel_specs(channel_specs):
    """Group repeated channel URLs while preserving all explicit owner names."""
    grouped = {}
    for owner_name, channel_url in channel_specs:
        normalized_url = _normalize_channel_url(channel_url)
        if not normalized_url:
            continue
        if normalized_url not in grouped:
            grouped[normalized_url] = {"owners": [], "url": normalized_url}
        if not _is_ownerless_channel(owner_name):
            clean_owner = _safe_text(owner_name)
            if clean_owner and clean_owner not in grouped[normalized_url]["owners"]:
                grouped[normalized_url]["owners"].append(clean_owner)
    return [(item["owners"] or [None], item["url"]) for item in grouped.values()]


def channel_has_videos(conn, channel_url):
    """Return True when a channel already has ingested videos."""
    row = conn.execute(
        """
        SELECT COUNT(videos.id)
        FROM channels
        JOIN videos ON videos.channel_id = channels.id
        WHERE channels.url = ?
        """,
        (_normalize_channel_url(channel_url),),
    ).fetchone()
    return bool(row and row[0])


def get_or_create_person(conn, name):
    """Create a person row if it does not already exist."""
    cursor = conn.execute("SELECT id FROM people WHERE name = ?", (name,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor = conn.execute(
        """
        INSERT INTO people (name, created_at, updated_at)
        VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (name,),
    )
    conn.commit()
    return cursor.lastrowid


def get_or_create_channel(conn, channel_url, owner_person_id, title=None):
    """Create a channel row if it does not already exist."""
    cursor = conn.execute("SELECT id FROM channels WHERE url = ?", (channel_url,))
    row = cursor.fetchone()
    if row:
        channel_id = row[0]
        conn.execute(
            "UPDATE channels SET owner_person_id = ?, title = COALESCE(?, title), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (owner_person_id, title, channel_id),
        )
        conn.commit()
        return channel_id

    cursor = conn.execute(
        """
        INSERT INTO channels (url, title, owner_person_id, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (channel_url, title, owner_person_id),
    )
    conn.commit()
    return cursor.lastrowid


def get_or_create_video(conn, title, url, channel_id, transcript=None):
    """Create a video row if it does not already exist."""
    cursor = conn.execute("SELECT id FROM videos WHERE url = ?", (url,))
    row = cursor.fetchone()
    if row:
        video_id = row[0]
        conn.execute(
            "UPDATE videos SET title = ?, transcript = COALESCE(?, transcript), channel_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (title, transcript, channel_id, video_id),
        )
        conn.commit()
        return video_id

    cursor = conn.execute(
        """
        INSERT INTO videos (title, url, transcript, channel_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (title, url, transcript, channel_id),
    )
    conn.commit()
    return cursor.lastrowid


def link_person_to_video(conn, video_id, person_id):
    """Link a person to a video without creating duplicates."""
    conn.execute(
        """
        INSERT OR IGNORE INTO video_people (video_id, person_id, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (video_id, person_id),
    )
    conn.commit()


def get_channel_videos(channel_url):
    """Fetch video metadata from a channel URL by targeting the channel's videos page."""
    try:
        import yt_dlp
    except Exception:
        return []

    channel_url = _safe_text(channel_url).rstrip("/")
    parsed = urlparse(channel_url)
    path = parsed.path.rstrip("/")

    if not path.endswith(("/videos", "/shorts", "/playlists")):
        if path.startswith("/@") or path.startswith("/channel/") or path.startswith("/user/") or path.startswith("/c/"):
            channel_url = f"{channel_url}/videos"

    ydl_opts = {
        "extract_flat": True,
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "logger": _SilentYtdlpLogger(),
        "playlistend": 1000,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(channel_url, download=False)
    except Exception:
        return []

    entries = []
    if isinstance(info, dict):
        if info.get("entries"):
            entries = info["entries"]
        elif info.get("url"):
            entries = [info]

    videos = []
    seen_urls = set()
    for entry in entries:
        if not entry:
            continue
        title = _safe_text(entry.get("title")) or "Untitled"
        url = entry.get("url") or entry.get("webpage_url") or entry.get("id")
        if not url:
            continue
        if not str(url).startswith("http"):
            url = f"https://www.youtube.com/watch?v={url}"
        if url in seen_urls:
            continue
        seen_urls.add(url)
        videos.append({"title": title, "url": url})

    return videos


def _extract_video_id(video_url):
    """Extract a YouTube video ID from a URL or raw ID string."""
    if not video_url:
        return None
    text = _safe_text(video_url)
    match = re.search(r"(?:v=|/shorts/|/embed/|youtu\.be/)([A-Za-z0-9_-]{11})", text)
    if match:
        return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", text):
        return text
    return None


def _transcript_from_ytdlp(video_url):
    """Try to download captions via yt-dlp and return the text content."""
    try:
        import yt_dlp
    except Exception:
        return ""

    video_id = _extract_video_id(video_url)
    if not video_id:
        return ""

    with tempfile.TemporaryDirectory() as tmpdir:
        ydl_opts = {
            "outtmpl": os.path.join(tmpdir, f"{video_id}.%(ext)s"),
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "logger": _SilentYtdlpLogger(),
            "ignoreerrors": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en"],
            "subtitlesformat": "vtt",
            "extractor_args": {"youtube": {"player_client": ["web", "android"]}},
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(video_url, download=True)
        except Exception:
            return ""

        subtitle_files = [
            os.path.join(tmpdir, name)
            for name in os.listdir(tmpdir)
            if name.endswith(".vtt")
        ]
        if not subtitle_files:
            return ""

        try:
            with open(subtitle_files[0], "r", encoding="utf-8") as handle:
                text = handle.read()
        except Exception:
            return ""

        lines = []
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
                continue
            if re.match(r"^\d{2}:\d{2}:\d{2}\.\d{3} -->", line):
                continue
            if line.startswith("<") and line.endswith(">"):
                continue
            if re.fullmatch(r"[0-9]+", line):
                continue
            lines.append(re.sub(r"<[^>]+>", "", line))

        return " ".join(lines)


def get_full_video_transcript(video_url):
    """Retrieve the full transcript for a video using the transcript API first, then captions via yt-dlp."""
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = _extract_video_id(video_url)
    if not video_id:
        return ""

    try:
        transcript_entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        text = " ".join(entry.get("text", "") for entry in transcript_entries if entry.get("text"))
        if text:
            return text
    except Exception:
        pass

    return _transcript_from_ytdlp(video_url)


def store_video_record(title, url, transcript, channel_id, owner_person_ids):
    """Store the video title, URL, transcript, and auto-link channel owners."""
    conn = sqlite3.connect(DB_PATH)
    try:
        video_id = get_or_create_video(conn, title, url, channel_id, transcript)
        if owner_person_ids is None:
            owner_ids = []
        elif isinstance(owner_person_ids, (list, tuple, set)):
            owner_ids = owner_person_ids
        else:
            owner_ids = [owner_person_ids]
        for owner_person_id in owner_ids:
            if owner_person_id is not None:
                link_person_to_video(conn, video_id, owner_person_id)
        return video_id
    finally:
        conn.close()


def backfill_transcripts(limit=None):
    """Fetch transcripts for stored videos and update their rows in the database."""
    conn = sqlite3.connect(DB_PATH)
    try:
        query = "SELECT id, url FROM videos WHERE (transcript IS NULL OR transcript = '') AND transcript_attempted_at IS NULL"
        params = []
        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        rows = conn.execute(query, params).fetchall()
        for video_id, url in rows:
            transcript = get_full_video_transcript(url)
            if transcript:
                conn.execute(
                    "UPDATE videos SET transcript = ?, transcript_attempted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (transcript, video_id),
                )
            else:
                conn.execute(
                    "UPDATE videos SET transcript_attempted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (video_id,),
                )
            conn.commit()
        return len(rows)
    finally:
        conn.close()


def store_people_records(people_names, video_id=None):
    """Store unique people and optionally link them to a video."""
    conn = sqlite3.connect(DB_PATH)
    try:
        for person_name in people_names:
            person_id = get_or_create_person(conn, person_name)
            if video_id is not None:
                link_person_to_video(conn, video_id, person_id)
    finally:
        conn.close()


def link_people_to_video(video_id, people_ids):
    """Create records linking people to a video in a junction table."""
    conn = sqlite3.connect(DB_PATH)
    try:
        for person_id in people_ids:
            link_person_to_video(conn, video_id, person_id)
    finally:
        conn.close()


def process_channel(owner_name, channel_url=None):
    """Create or reuse a channel and optional owner, then ingest all videos."""
    if channel_url is None:
        channel_url = owner_name
        owner_name = infer_owner_name_from_channel_url(channel_url)

    channel_url = _normalize_channel_url(channel_url)
    owner_values = owner_name if isinstance(owner_name, (list, tuple, set)) else [owner_name]
    owner_names = [_safe_text(name) for name in owner_values if not _is_ownerless_channel(name)]
    owner_names = list(dict.fromkeys(name for name in owner_names if name))
    channel_title = _owner_label(owner_names) if owner_names else infer_owner_name_from_channel_url(channel_url)
    conn = sqlite3.connect(DB_PATH)
    try:
        owner_ids = [get_or_create_person(conn, name) for name in owner_names]
        primary_owner_id = owner_ids[0] if owner_ids else None
        channel_id = get_or_create_channel(conn, channel_url, primary_owner_id, title=channel_title)
        owner_label = _owner_label(owner_names)
        print(f"Channel ready: {channel_url} (owner: {owner_label})")

        if channel_has_videos(conn, channel_url):
            print("Skipping channel; videos already ingested.")
            return channel_id, primary_owner_id, 0

        videos = get_channel_videos(channel_url)
        if not videos:
            print("No videos found for this channel.")
            return channel_id, primary_owner_id, 0

        total_videos = len(videos)
        print(f"Processing {total_videos} videos...")
        for index, video in enumerate(videos, start=1):
            title = _safe_text(video.get("title")) or "Untitled"
            url = _safe_text(video.get("url"))
            print(f"[{index}/{total_videos}] {title}")
            video_id = store_video_record(title, url, "", channel_id, owner_ids)
            people_names = extract_people_from_text(title)
            if people_names:
                store_people_records(people_names, video_id=video_id)
                print(f"  people extracted: {', '.join(people_names)}")
            else:
                print("  people extracted: none")

        cursor = conn.execute(
            "SELECT channels.url, COUNT(videos.id) AS video_count FROM channels LEFT JOIN videos ON videos.channel_id = channels.id GROUP BY channels.id"
        )
        for channel_url_row, count in cursor.fetchall():
            print(f"Channel rows: {channel_url_row} -> {count}")

        print(f"Completed ingest for {len(videos)} videos")
        print("Transcript backfill will run separately in the background pass.")
        return channel_id, primary_owner_id, len(videos)
    finally:
        conn.close()


def main(channel_specs=None):
    """Run the initial workflow for a list of channels, then backfill transcripts separately."""
    initialize_database()

    # Use None for channels that are not clearly owned by a named individual.
    default_channel_specs = [
        ("Konstantin Kisin", "https://www.youtube.com/@triggerpod"),
        ("Francis Foster", "https://www.youtube.com/@triggerpod"),

        ("Steven Bartlett", "https://www.youtube.com/@TheDiaryOfACEO"),

        (None, "https://www.youtube.com/@goodolboyzpodcast"),

        ("Jim Al-Khalili", "https://www.youtube.com/@UnbaffledScience"),

        (None, "https://www.youtube.com/@AbelPrize"),

        ("Brian Greene", "https://www.youtube.com/@WorldScienceFestival"),
        ("Tracy Day", "https://www.youtube.com/@WorldScienceFestival"),

        ("Neil deGrasse Tyson", "https://www.youtube.com/@StarTalk"),

        ("Brandon Sanderson", "https://www.youtube.com/@BrandSanderson"),

        ("Pascal Lottaz", "https://www.youtube.com/@neutralitystudies"),

        ("Brian Keating", "https://www.youtube.com/@DrBrianKeating"),

        (None, "https://www.youtube.com/channel/UCvQECJukTDE2i6aCoMnS-Vg"),

        ("Sean Carroll", "https://www.youtube.com/channel/UCRhV1rWIpm_pU19bBm_2RXw"),

        ("Amin Jazayeri", "https://www.youtube.com/@UntriggeredPodcast"),
        ("Stuvi Krishnan", "https://www.youtube.com/@UntriggeredPodcast"),
        ("Yug Patil", "https://www.youtube.com/@UntriggeredPodcast"),
        ("Krishna Vasisht", "https://www.youtube.com/@UntriggeredPodcast"),

        ("Jesse Michels", "https://www.youtube.com/@JesseMichels"),

        ("Jimmy Fallon", "https://www.youtube.com/@fallontonight"),

        ("David Eagleman", "https://www.youtube.com/@InnerCosmosPod"),

        (None, "https://www.youtube.com/@FiloNews"),

        ("Vinamre Kasanaa", "https://www.youtube.com/@dostcast"),

        ("Ranveer Allahbadia", "https://www.youtube.com/channel/UCneyi-aYq4VIBYIAQgWmk_w"),

        ("Dave Rubin", "https://www.youtube.com/@RubinReport"),

        ("Ezra Klein", "https://www.youtube.com/@EzraKleinShow"),

        ("Tucker Carlson", "https://www.youtube.com/@TCNetwork"),

        (None, "https://www.youtube.com/@TheInstituteOfArtAndIdeas"),

        ("Nicole Shanahan", "https://www.youtube.com/@Nicole-Shanahan"),

        ("Tom Bilyeu", "https://www.youtube.com/channel/UCnYMOamNKLGVlJgRUbamveA"),

        ("Lawrence M. Krauss", "https://www.youtube.com/@TheOriginsPodcast"),

        ("Jake Shields", "https://www.youtube.com/channel/UCsIKjlSV98RWt5IfK5VVJZA"),

        ("Daniel Haqiqatjou", "https://www.youtube.com/channel/UCWdkdpfxKpfi6aGT8hwFXtA"),

        ("Matt McCusker", "https://www.youtube.com/@MSsecretpod"),
        ("Shane Gillis", "https://www.youtube.com/@MSsecretpod"),

        ("Tim Dillon", "https://www.youtube.com/channel/UC4woSp8ITBoYDmjkukhEhxg"),

        ("Dan Soder", "https://www.youtube.com/@DanSoder"),

        ("Amy Poehler", "https://www.youtube.com/@Good-Hang-with-Amy-Poehler"),

        ("Tim Pool", "https://www.youtube.com/@Timcast"),

        ("H. Foley", "https://www.youtube.com/@AreYouGarbage"),
        ("Kevin Ryan", "https://www.youtube.com/@AreYouGarbage"),

        ("Dwarkesh Patel", "https://www.youtube.com/channel/UCXl4i9dYBrFOabk0xGmbkRA"),

        ("Tyson Hockley", "https://www.youtube.com/@TysonHockley"),

        ("Crow Valdés", "https://www.youtube.com/@crowvaldes666"),

        ("Andrew Santino", "https://www.youtube.com/@AndrewSantinoWhiskeyGinger"),

        ("Jake Julius", "https://www.youtube.com/@rattlesnaketv"),

        ("Jack Neel", "https://www.youtube.com/@jackneelpodcast"),

        ("Shaquille O'Neal", "https://www.youtube.com/channel/UCIOXmaExi4DjLHGyGvnu3bw"),
        ("Adam Lefkoe", "https://www.youtube.com/channel/UCIOXmaExi4DjLHGyGvnu3bw"),

        ("Tristan Tate", "https://www.youtube.com/@tristanuniversityofficial"),

        ("Anas Bukhash", "https://www.youtube.com/@ABtalks"),

        ("Bradley Martyn", "https://www.youtube.com/@REALRAWTALK"),

        ("Rick Sanchez", "https://www.youtube.com/@Sanchez_Effect"),

        (None, "https://www.youtube.com/@OnePathNetwork"),

        ("Moutasem Atiya", "https://www.youtube.com/@moutasematiya"),

        ("Firas Zahabi", "https://www.youtube.com/@CoachZahabi"),

        ("Paul Williams", "https://www.youtube.com/@BloggingTheology"),

        ("Mohammed Hijab", "https://www.youtube.com/@MohammedHijab"),

        ("Patrick Bet-David", "https://www.youtube.com/@PBDPodcast"),
        ("Adam Sosnick", "https://www.youtube.com/@PBDPodcast"),
        ("Tom Ellsworth", "https://www.youtube.com/@PBDPodcast"),
        ("Vincent Oshana", "https://www.youtube.com/@PBDPodcast"),

        ("Dominick Cruz", "https://www.youtube.com/@TheDominickCruz"),

        (None, "https://www.youtube.com/@MuzehidLive"),

        ("Frankie Lee", "https://www.youtube.com/@FrankieLeePodcast"),

        (None, "https://www.youtube.com/@KSTHEQUEST"),

        (None, "https://www.youtube.com/@DrSyed"),

        ("Sean Kelly", "https://www.youtube.com/@DigitalSocialHour"),

        ("Candace Owens", "https://www.youtube.com/@RealCandaceO"),

        ("Amrou Fudl", "https://www.youtube.com/@FreshFitMiami"),
        ("Walter Weekes", "https://www.youtube.com/@FreshFitMiami"),

        ("Nicky Rodriguez", "https://www.youtube.com/@simplemanpodcast"),
        ("Ethan Crelinsten", "https://www.youtube.com/@simplemanpodcast"),
        ("Damien Anderson", "https://www.youtube.com/@simplemanpodcast"),
        ("Nicky Ryan", "https://www.youtube.com/@simplemanpodcast"),

        ("Ahmad Mahmood", "https://www.youtube.com/@AhmadMahmoodShow"),

        ("Raheem Khalid", "https://www.youtube.com/@ceocast"),

        ("Michael Franzese", "https://www.youtube.com/@michaelfranzese"),

        ("Fidias Panayiotou", "https://www.youtube.com/@FidiasPodcast"),

        ("George Janko", "https://www.youtube.com/GeorgeJanko"),

        ("Mohamed Beiraghdary", "https://www.youtube.com/@MoVlogs"),

        ("Keith Hodge", "https://www.youtube.com/@HodgetwinsPodcast"),
        ("Kevin Hodge", "https://www.youtube.com/@HodgetwinsPodcast"),

        ("Samuel Leeds", "https://www.youtube.com/@SamuelLeeds"),

        ("Omar Elattar", "https://www.youtube.com/@thepassionatefew"),

        ("Mario Nawfal", "https://www.youtube.com/@MarioNawfal"),

        ("Tracy Harmoush", "https://www.youtube.com/@TracyHarmoush"),

        (None, "https://www.youtube.com/@StandOutTV_"),

        ("Nzube Udezue", "https://www.youtube.com/@ZubyMusic"),

        ("Liz Plank", "https://www.youtube.com/@feministabulous"),

        ("Robert Lawrence Kuhn", "https://www.youtube.com/@CloserToTruthTV"),

        (None, "https://www.youtube.com/@muhebbulilm"),

        (None, "https://www.youtube.com/channel/UCoZnEQMqVvv_DkF50fupMKw"),

        ("Ryan Peterman", "https://www.youtube.com/@RyanLPeterman"),

        ("Jack Roycroft-Sherry", "https://www.youtube.com/@JackRoycroftSherry"),

        ("Jim Rutt", "https://www.youtube.com/@jimruttshow"),

        (None, "https://www.youtube.com/@QualiaResearchInstitute"),

        (None, "https://www.youtube.com/channel/UCpdyFxSktWo3W6kMYfmk6lg"),

        (None, "https://www.youtube.com/channel/UCqcbQf6yw5KzRoDDcZ_wBSw"),

        (None, "https://www.youtube.com/@SPRIND_Bundesagentur"),

        ("Natascha McElhone", "https://www.youtube.com/@whrshallwemeet"),
        ("Omid Ashtari", "https://www.youtube.com/@whrshallwemeet"),

        (None, "https://www.youtube.com/@models-of-consciousness"),

        (None, "https://www.youtube.com/@everlastai"),

        (None, "https://www.youtube.com/@GiantsShoulderClips"),

        (None, "https://www.youtube.com/@TEDx"),

        (None, "https://www.youtube.com/@SingularityNET"),

        (None, "https://www.youtube.com/@thecomputingbrain2663"),

        ("Vance Crowe", "https://www.youtube.com/@VanceCrowePodcast"),

        ("Stephen Welch", "https://www.youtube.com/@WelchLabs"),

        ("Mikhail Shalaginov", "https://www.youtube.com/@632nmPodcast"),
        ("Michael Dubrovsky", "https://www.youtube.com/@632nmPodcast"),
        ("Xinghui Yin", "https://www.youtube.com/@632nmPodcast"),

        (None, "https://www.youtube.com/@alchemistaccelerator"),

        (None, "https://www.youtube.com/@trajectoryai"),

        (None, "https://www.youtube.com/@iamp_seminars"),

        ("Matthew Geleta", "https://www.youtube.com/@MatthewGeleta"),

        (None, "https://www.youtube.com/@CIMCAIYT"),

        ("Julia La Roche", "https://www.youtube.com/@TheJuliaLaRocheShow"),

        ("Tim Scarfe", "https://www.youtube.com/@MachineLearningStreetTalk"),
        ("Keith Duggar", "https://www.youtube.com/@MachineLearningStreetTalk"),
        ("Yannic Kilcher", "https://www.youtube.com/@MachineLearningStreetTalk"),

        (None, "https://www.youtube.com/@InfoTechRG"),

        (None, "https://www.youtube.com/@AO1Podcast"),

        (None, "https://www.youtube.com/@Delphi_Digital"),

        (None, "https://www.youtube.com/channel/UCg5UVUMqXeCQ03MelT_RXMg"),

        (None, "https://www.youtube.com/@scfu"),

        (None, "https://www.youtube.com/@thegiantsshoulder"),

        (None, "https://www.youtube.com/@ConvergentScienceNw"),

        (None, "https://www.youtube.com/@QuickLearnAIMakesYouSmarte-f7q"),

        ("Andre Duqum", "https://www.youtube.com/@Andreduqum"),

        ("Li Jingjing", "https://www.youtube.com/@Jingjing_Li"),

        ("Brian Davila", "https://www.youtube.com/@TheWaywithBrianDavila"),
        
            ("Jason Jones", "https://www.youtube.com/@TheJasonJonesShow"),

    ("Theo Von", "https://www.youtube.com/@TheoVon"),

    ("Tommy G", "https://www.youtube.com/@TommyGMcGee"),

    ("Carlos Farias", "https://www.youtube.com/@carlos"),

    ("Dalton Fischer", "https://www.youtube.com/@DaltonFischerPodcast"),

    ("Jay Dyer", "https://www.youtube.com/@JayDyer"),

    (None, "https://www.youtube.com/@Help-lawyer"),

    (None, "https://www.youtube.com/@ladbiblestories"),

    ("Danny Jones", "https://www.youtube.com/@dannyjones"),

    ("Julian Dorey", "https://www.youtube.com/@JulianDorey"),

    ("Matan Even", "https://www.youtube.com/@matanevenoff"),

    ("Andy Stumpf", "https://www.youtube.com/@ClearedHotPodcast"),

    ("Brian Goldstein", "https://www.youtube.com/@TruthHurtsShow"),
    ("Makan Mostafavi", "https://www.youtube.com/@TruthHurtsShow"),

    ("Matthew B. Cox", "https://www.youtube.com/@InsideTrueCrime"),

    ("Shawn Ryan", "https://www.youtube.com/@ShawnRyanShow"),

    ("Francesca Tighinean", "https://www.youtube.com/@francescapsychology"),

    ("Lisa Bilyeu", "https://www.youtube.com/channel/UCeir7Wbzzfg43c1eL7PSa3g"),

    ("Andrew Schulz", "https://www.youtube.com/@OfficialFlagrant"),
    ("AlexxMedia", "https://www.youtube.com/@OfficialFlagrant"),
    ("Mark Gagnon", "https://www.youtube.com/@OfficialFlagrant"),

    ("Jeremy Miner", "https://www.youtube.com/@JeremyMinerPodcast"),

    ("Hasan Abiy", "https://www.youtube.com/@HasanAbiy"),

    ("Tim Dodd", "https://www.youtube.com/channel/UC6uKrU_WqJ1R2HMTY3LIx5Q"),

    (None, "https://www.youtube.com/@elonmuskeditor"),

    ("Rishi Sunak", "https://www.youtube.com/@RishiSunak"),

    ("Cleo Abram", "https://www.youtube.com/@CleoAbram"),

    ("Logan Paul", "https://www.youtube.com/@Impaulsive"),
    ("Mike Majlak", "https://www.youtube.com/@Impaulsive"),

    ("Bradford G. Smith", "https://www.youtube.com/watch?v=uDKGpOb6W94"),

    (None, "https://www.youtube.com/@NovaraMedia"),

    ("Don Lemon", "https://www.youtube.com/@TheDonLemonShow"),

    (None, "https://www.youtube.com/@BrighterwithHerbert"),

    ("Bill Maher", "https://www.youtube.com/@RealTime"),

    ("Peter Diamandis", "https://www.youtube.com/@peterdiamandis"),

    ("Nikhil Kamath", "https://www.youtube.com/@nikhil.kamath"),

    ("Shawn Johnson", "https://www.youtube.com/@ShawnJohnsonPod"),
    ("Andrew East", "https://www.youtube.com/@ShawnJohnsonPod"),

    ("Ted Cruz", "https://www.youtube.com/@VerdictwithTedCruz"),
    ("Ben Ferguson", "https://www.youtube.com/@VerdictwithTedCruz"),

    ("Raj Shamani", "https://www.youtube.com/@rajshamani"),

    ("Mike Ritland", "https://www.youtube.com/@MikeRitland"),

    (None, "https://www.youtube.com/@StansberryMedia"),

    (None, "https://www.youtube.com/@oakeshottlectures"),

    (None, "https://www.youtube.com/@_foundersfund"),

    ("Katie Miller", "https://www.youtube.com/@katiemillerpod"),

    ("Peter Thiel", "https://www.youtube.com/@everypeterthielvideo6005"),

    (None, "https://www.youtube.com/@thefreepress"),

    (None, "https://www.youtube.com/@ChicagoIdeasWeek"),

    ("Kara Swisher", "https://www.youtube.com/@pivot"),
    ("Scott Galloway", "https://www.youtube.com/@pivot"),

    (None, "https://www.youtube.com/@HooverInstitution"),
        
    ]

    queue = _dedupe_channel_specs(channel_specs or default_channel_specs)
    total = len(queue)
    for index in range(total):
        owner_names, channel_url = queue[index]
        owner_label = _owner_label(owner_names)
        print(f"[{index + 1}/{total}] Processing {owner_label} -> {channel_url}")
        process_channel(owner_names, channel_url)
        print(f"Completed {owner_label}.")

    print("Starting transcript backfill pass...")
    backfill_count = backfill_transcripts(limit=None)
    print(f"Backfilled transcripts for {backfill_count} videos")


if __name__ == "__main__":
    main()
