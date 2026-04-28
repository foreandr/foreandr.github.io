# Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

# /mnt/data/yt.py

import yt_dlp
from datetime import datetime
from difflib import SequenceMatcher
from typing import Dict, List, Any, Optional


def _clean_title_basic(s: str) -> str:
    """
    Keep this conservative: only remove the common '?v=' artifact and trim whitespace/newlines.
    """
    if not s:
        return ""
    return s.split('?v=')[0].split('\n')[0].strip()


def _sim(a: str, b: str) -> float:
    return SequenceMatcher(None, (a or "").lower(), (b or "").lower()).ratio()


def get_channel_data(channel_url, fast=True):
    """
    Scrapes YouTube channel videos.
    fast=True: Extremely fast, uses extract_flat, no descriptions.
    fast=False: Very slow, visits every video page for descriptions.
    """
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'no_warnings': True,
        'extract_flat': fast,  # Toggle based on speed requirement
    }

    video_list = []
    crawl_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        mode_label = "FAST (No Descs)" if fast else "SLOW (Full Metadata)"
        print(f"[{mode_label}] Fetching: {channel_url}...")

        # Targets the /videos tab for clean indexing
        result = ydl.extract_info(f"{channel_url}/videos", download=False)

        if 'entries' in result:
            for entry in result['entries']:
                raw_title = entry.get("title", "No Title")
                clean_title = _clean_title_basic(raw_title)

                raw_date = entry.get("upload_date")
                formatted_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}" if raw_date else "N/A"

                if fast:
                    clean_desc = ""
                else:
                    raw_desc = entry.get("description") or "No description"
                    clean_desc = raw_desc[:300].replace('\n', ' ') + "..."

                video_data = {
                    "title": clean_title,
                    "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
                    "views": entry.get("view_count"),
                    "description": clean_desc,
                    "upload_date": formatted_date,
                    "crawl_time": crawl_time
                }
                video_list.append(video_data)

    return video_list


def search_youtube(query, limit=10):
    print(f"\nSearching for long videos about '{query}'...")

    MIN_MINUTES = 60
    min_seconds = MIN_MINUTES * 60
    search_query = f"ytsearch50:{query}"

    ydl_opts = {
        'extract_flat': True,
        'quiet': True,
        'no_warnings': True,
        'match_filter': f"duration > {min_seconds}",
    }

    results = []
    skipped_count = 0

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(search_query, download=False)

            if 'entries' in info:
                for entry in info['entries']:
                    if not entry:
                        continue

                    duration = entry.get('duration')

                    if duration and duration >= min_seconds:
                        results.append({
                            'title': entry.get('title'),
                            'url': entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                            'duration_min': round(duration / 60, 2),
                            'channel_name': entry.get('uploader') or entry.get('channel'),
                            'channel_url': entry.get('uploader_url') or entry.get('channel_url'),
                            'type': 'video'
                        })
                    else:
                        skipped_count += 1

                    if len(results) >= limit:
                        break
    except Exception as e:
        print(f"Search error: {e}")

    if skipped_count > 0:
        print(f">>> SKIPPED {skipped_count} videos shorter than {MIN_MINUTES} mins.")

    return results

def title_similarity_stats(podcast_title: str, videos: List[Dict[str, Any]], last_n: int = 10) -> Dict[str, Any]:
    """
    SECOND CHECK:
      Compare Wikidata podcast title vs video titles from the channel.

    Returns:
      - avg_all: average similarity across ALL video titles
      - avg_last_n: average similarity across the most recent last_n titles (as returned by /videos)
      - max_one: max similarity score among all titles (useful if titles rarely include show name)
      - top10_avg: average of the 10 most similar titles (useful if only some titles include show name)
      - count: number of videos scored
    """
    p = _clean_title_basic(podcast_title)
    titles = [_clean_title_basic(v.get("title", "")) for v in (videos or [])]
    titles = [t for t in titles if t]

    if not titles or not p:
        return {
            "avg_all": 0.0,
            "avg_last_n": 0.0,
            "max_one": 0.0,
            "top10_avg": 0.0,
            "count": len(titles),
            "podcast_title": p,
        }

    scores = [_sim(p, t) for t in titles]
    avg_all = sum(scores) / len(scores)

    last_slice = titles[:last_n] if len(titles) >= 1 else []
    last_scores = [_sim(p, t) for t in last_slice] if last_slice else []
    avg_last_n = (sum(last_scores) / len(last_scores)) if last_scores else 0.0

    max_one = max(scores) if scores else 0.0

    top_k = sorted(scores, reverse=True)[:10]
    top10_avg = (sum(top_k) / len(top_k)) if top_k else 0.0

    return {
        "avg_all": avg_all,
        "avg_last_n": avg_last_n,
        "max_one": max_one,
        "top10_avg": top10_avg,
        "count": len(titles),
        "podcast_title": p,
    }


if __name__ == "__main__":
    get_channel_data(channel_url='https://www.youtube.com/@joerogan', fast=True)