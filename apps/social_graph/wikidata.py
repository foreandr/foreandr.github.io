# Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

# /mnt/data/test.py

import time
import requests
from typing import Optional, List, Dict, Any
import yt  # keep your import as-is (even if unused)
from difflib import SequenceMatcher


WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
WIKIDATA_ENTITY_SEARCH_URL = "https://www.wikidata.org/w/api.php"

# IMPORTANT:
# Put a REAL url or email in here. Wikimedia wants a contact method.
# Example:
#   "podcast-title-fetcher/1.0 (contact: andre@example.com)"
# or:
#   "podcast-title-fetcher/1.0 (https://yourdomain.com/contact)"
USER_AGENT = "podcast-title-fetcher/1.0 (contact: your_email@example.com)"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": USER_AGENT,
    "Accept": "application/json,text/plain,*/*",
})

# Separate session for YouTube page fetching (more browser-like UA helps avoid trivial blocks)
YOUTUBE_SESSION = requests.Session()
YOUTUBE_SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
})


def _get_with_retries(url: str, *, params: dict, accept: str, timeout: int = 20) -> requests.Response:
    """
    Minimal retry logic for Wikimedia endpoints.
    Retries on: 429, 500, 502, 503, 504
    """
    last_exc = None
    for attempt in range(4):
        try:
            headers = {"Accept": accept, "User-Agent": USER_AGENT}
            r = SESSION.get(url, params=params, headers=headers, timeout=timeout)
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(0.75 * (attempt + 1))
                continue
            return r
        except Exception as e:
            last_exc = e
            time.sleep(0.75 * (attempt + 1))
    if last_exc:
        raise last_exc
    raise RuntimeError("Request failed with retries")


def _run_sparql(query: str) -> List[dict]:
    r = _get_with_retries(
        WIKIDATA_SPARQL_URL,
        params={"format": "json", "query": query},
        accept="application/sparql-results+json",
        timeout=25,
    )
    r.raise_for_status()
    return r.json().get("results", {}).get("bindings", [])


def _clean_title(s: str) -> str:
    return " ".join((s or "").strip().strip(" \"'“”‘’").split())


def _pick_best_work(rows: List[dict]) -> Optional[str]:
    if not rows:
        return None

    def score(row: dict) -> int:
        tl = (row.get("typeLabel", {}).get("value", "") or "").lower()
        if "podcast" in tl:
            return 100
        if "audio series" in tl:
            return 80
        if "web series" in tl:
            return 40
        if "talk show" in tl:
            return 30
        return 1

    best = max(rows, key=score)
    title = best.get("workLabel", {}).get("value", "")
    title = _clean_title(title)
    return title or None


# ---------------------------
# QID discovery (2 methods)
# ---------------------------

def _wikidata_search_entity_api(person_name: str, limit: int = 5) -> List[str]:
    """
    Method A: Wikidata API search (wbsearchentities). Can 403 for some UAs/IPs.
    """
    params = {
        "action": "wbsearchentities",
        "search": person_name,
        "language": "en",
        "format": "json",
        "limit": limit,
        "type": "item",
    }
    r = _get_with_retries(
        WIKIDATA_ENTITY_SEARCH_URL,
        params=params,
        accept="application/json",
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    qids = []
    for item in data.get("search", []):
        qid = item.get("id")
        if qid:
            qids.append(qid)
    return qids


def _wikidata_find_human_qids_sparql(person_name: str, limit: int = 5) -> List[str]:
    """
    Method B: SPARQL lookup by label, restricted to humans (instance of Q5).
    Avoids wbsearchentities entirely.
    """
    query = f"""
    SELECT ?person WHERE {{
      ?person wdt:P31 wd:Q5 .
      {{
        ?person rdfs:label "{person_name}"@en .
      }}
      UNION
      {{
        ?person skos:altLabel "{person_name}"@en .
      }}
    }}
    LIMIT {limit}
    """
    rows = _run_sparql(query)
    qids = []
    for row in rows:
        uri = row.get("person", {}).get("value", "")
        if uri.startswith("http://www.wikidata.org/entity/"):
            qids.append(uri.rsplit("/", 1)[-1])
    return qids


def _get_candidate_qids(person_name: str, limit: int = 5) -> List[str]:
    """
    Try API search; if blocked, fall back to SPARQL label lookup.
    """
    try:
        qids = _wikidata_search_entity_api(person_name, limit=limit)
        if qids:
            return qids
    except Exception:
        pass
    return _wikidata_find_human_qids_sparql(person_name, limit=limit)


# ---------------------------
# Podcast title
# ---------------------------

def get_podcast_title_wikidata(person_name: str) -> Optional[str]:
    qids = _get_candidate_qids(person_name, limit=20)
    if not qids:
        return None

    for qid in qids:
        tight = f"""
        SELECT ?work ?workLabel ?type ?typeLabel WHERE {{
          VALUES ?person {{ wd:{qid} }}

          {{
            ?work wdt:P371 ?person .
          }} UNION {{
            ?work wdt:P161 ?person .
          }} UNION {{
            ?work wdt:P175 ?person .
          }}

          ?work wdt:P31 ?type .
          VALUES ?type {{
            wd:Q24634210   # podcast
            wd:Q106833     # audio drama (sometimes used for audio series)
            wd:Q7725634    # web series
          }}

          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 30
        """
        rows = _run_sparql(tight)
        title = _pick_best_work(rows)
        if title:
            return title

        broad = f"""
        SELECT ?work ?workLabel ?type ?typeLabel WHERE {{
          VALUES ?person {{ wd:{qid} }}

          {{
            ?work wdt:P371 ?person .
          }} UNION {{
            ?work wdt:P161 ?person .
          }} UNION {{
            ?work wdt:P175 ?person .
          }}

          OPTIONAL {{ ?work wdt:P31 ?type . }}

          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 30
        """
        rows = _run_sparql(broad)
        title = _pick_best_work(rows)
        if title:
            return title

    return None


def get_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


# ---------------------------
# YouTube info (what your screenshot shows)
# ---------------------------

def _best_youtube_url(channel_id: Optional[str], handle: Optional[str]) -> Optional[str]:
    if handle:
        return f"https://www.youtube.com/@{handle}"
    if channel_id:
        return f"https://www.youtube.com/channel/{channel_id}"
    return None


def get_youtube_info_wikidata(person_name: str) -> Optional[Dict[str, Any]]:
    """
    Returns a dict with:
      - qid
      - youtube_channel_id
      - youtube_handle
      - youtube_url (constructed)
      - viewers_listeners (P5436 value, if present)
      - point_in_time (P585, if present)
      - determination_method (P459 label, if present)
    """
    qids = _get_candidate_qids(person_name, limit=20)
    if not qids:
        return None

    for qid in qids:
        query_stmt = f"""
        SELECT ?views ?pointInTime ?channelId ?handle ?methodLabel WHERE {{
          VALUES ?person {{ wd:{qid} }}

          ?person p:P5436 ?stmt .
          ?stmt ps:P5436 ?views .

          OPTIONAL {{ ?stmt pq:P585 ?pointInTime . }}
          OPTIONAL {{ ?stmt pq:P2397 ?channelId . }}
          OPTIONAL {{ ?stmt pq:P11245 ?handle . }}
          OPTIONAL {{ ?stmt pq:P459 ?method . }}

          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        ORDER BY DESC(?pointInTime)
        LIMIT 5
        """
        rows_stmt = _run_sparql(query_stmt)

        query_direct = f"""
        SELECT ?channelId ?handle WHERE {{
          VALUES ?person {{ wd:{qid} }}
          OPTIONAL {{ ?person wdt:P2397 ?channelId . }}
          OPTIONAL {{ ?person wdt:P11245 ?handle . }}
        }}
        LIMIT 5
        """
        rows_direct = _run_sparql(query_direct)

        channel_id = None
        handle = None
        point_in_time = None
        method_label = None
        views = None

        if rows_stmt:
            channel_id = rows_stmt[0].get("channelId", {}).get("value")
            handle = rows_stmt[0].get("handle", {}).get("value")
            point_in_time = rows_stmt[0].get("pointInTime", {}).get("value")
            method_label = rows_stmt[0].get("methodLabel", {}).get("value")
            views = rows_stmt[0].get("views", {}).get("value")

        if (not channel_id) and rows_direct:
            channel_id = rows_direct[0].get("channelId", {}).get("value")
        if (not handle) and rows_direct:
            handle = rows_direct[0].get("handle", {}).get("value")

        if not any([channel_id, handle, views, point_in_time, method_label]):
            continue

        channel_id = str(channel_id) if channel_id else None
        handle = str(handle) if handle else None
        point_in_time = str(point_in_time) if point_in_time else None
        method_label = str(method_label) if method_label else None
        views = str(views) if views else None

        return {
            "qid": qid,
            "youtube_channel_id": channel_id,
            "youtube_handle": handle,
            "youtube_url": _best_youtube_url(channel_id, handle),
            "viewers_listeners": views,
            "point_in_time": point_in_time,
            "determination_method": method_label,
        }

    return None


# ---------------------------
# Fetch the channel page title from the YouTube URL we constructed
# ---------------------------

def get_youtube_page_title(youtube_url: str) -> Optional[str]:
    """
    Fetches the HTML for the YouTube URL and extracts the human-visible page title.

    Strategy:
      1) Prefer <meta property="og:title" content="...">
      2) Fall back to <title>...</title> (usually: "<Channel Name> - YouTube")
    """
    if not youtube_url:
        return None

    last_exc = None
    for attempt in range(3):
        try:
            r = YOUTUBE_SESSION.get(youtube_url, timeout=20, allow_redirects=True)
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(0.75 * (attempt + 1))
                continue
            if r.status_code != 200:
                return None

            html = r.text or ""
            lower = html.lower()

            og_key = 'property="og:title"'
            idx = lower.find(og_key)
            if idx != -1:
                window = html[idx:idx + 600]
                wlower = window.lower()
                cidx = wlower.find('content="')
                if cidx != -1:
                    start = cidx + len('content="')
                    end = window.find('"', start)
                    if end != -1:
                        val = window[start:end].strip()
                        val = _clean_title(val)
                        if val:
                            return val

            t1 = lower.find("<title>")
            if t1 != -1:
                t2 = lower.find("</title>", t1)
                if t2 != -1:
                    val = html[t1 + len("<title>"):t2]
                    val = _clean_title(val)
                    if val:
                        if val.lower().endswith(" - youtube"):
                            val = _clean_title(val[:-len(" - youtube")])
                        return val

            return None
        except Exception as e:
            last_exc = e
            time.sleep(0.75 * (attempt + 1))

    if last_exc:
        return None
    return None


# ---------------------------
# NEW: per-person decision logic (prints NOTHING unless it passes threshold)
# ---------------------------

def get_person_podcast_info(person: str, *, threshold: float = 0.55):
    # print("person:", person)
    """
    Runs the whole pipeline for a single person.

    Rule:
      - compute 2 similarities:
          (1) sim(podcast_title, youtube_page_title)
          (2) sim(person_name, youtube_page_title)
      - if BOTH < threshold -> return None (caller prints nothing and moves on)
      - else -> return a dict with person, channel_title, channel_url
    """
    wiki_podcast_title = get_podcast_title_wikidata(person)
    # print("wiki_podcast_title:", wiki_podcast_title)

    yt_info = get_youtube_info_wikidata(person)
    # print("yt_info:", yt_info)

    if not wiki_podcast_title or not yt_info:
        return None
    # print("1")

    yt_url = yt_info.get("youtube_url")
    if not yt_url:
        return None
    # print("2")

    yt_title = get_youtube_page_title(yt_url)
    if not yt_title:
        return None
    # print("3")

    sim_podcast_vs_yt = get_similarity(wiki_podcast_title, yt_title)
    sim_person_vs_yt = get_similarity(person, yt_title)
    #print("sim_podcast_vs_yt:", sim_podcast_vs_yt)
    #print("sim_person_vs_yt :", sim_person_vs_yt)


    if (sim_podcast_vs_yt < threshold) and (sim_person_vs_yt < threshold):
        return None
    #print(4)

    return {
        "person": person,
        "channel_title": yt_title,
        "channel_url": yt_url,
    }