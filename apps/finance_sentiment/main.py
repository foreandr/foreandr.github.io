import praw
import pandas as pd
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from datetime import datetime, timezone
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re
import sys
import os
import threading
import time
import data

# --- 1. CONFIGURATION & CREDENTIALS ---
CLIENT_ID = "hvHilV5J_dC-8w"
CLIENT_SECRET = "9BJjQlNX4D-56JRlk-B27efgw9c"
USER_AGENT = "SentimentBot v1.0 by /u/DNuttys"

# --- PERFORMANCE TUNING ---
# Each thread gets its own PRAW instance (own HTTP session + rate-limit handler).
# Reddit allows ~60 requests/min per OAuth client. With 10 threads PRAW's
# built-in rate limiter will throttle automatically — no manual sleeps needed.
MAX_WORKERS = 10          # concurrent subreddit workers
POSTS_PER_SUB = 100       # top posts to pull per subreddit
COMMENTS_PER_POST = 500   # max top-level comments per post
CHECKPOINT_EVERY = 10     # save progress every N subreddits

# File Names
RAW_DATA_FILE = "raw_sentiment.json"
REPORT_FILE = "report.json"
JS_DATA_FILE = "sentiment_data.js"
CHECKPOINT_FILE = "checkpoint.json"

# Initialize Tools
nltk.download('vader_lexicon', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)

analyzer = SentimentIntensityAnalyzer()

STOP_WORDS = set(nltk.corpus.stopwords.words('english')) | {
    'like', 'just', 'get', 'got', 'would', 'could', 'one', 'also',
    'even', 'know', 'think', 'really', 'much', 'still', 'going',
    'right', 'make', 'see', 'thing', 'things', 'way', 'people',
    'something', 'lot', 'good', 'well', 'back', 'want', 'take',
    'need', 'say', 'said', 'go', 'come', 'look', 'use', 'new',
    'time', 'year', 'long', 'made', 'many', 'keep', 'put', 'let',
    'lol', 'yeah', 'yes', 'deleted', 'removed', 'http', 'https',
    'www', 'com', 'reddit', 'amp', 'nbsp', 'edit', 'gif', 'img',
    'png', 'jpg', 'jpeg', 'etc', 'imo', 'tbh', 'though', 'actually',
    'probably', 'sure', 'gonna', 'dont', 'doesnt', 'didnt', 'thats',
    'cant', 'wont', 'isnt', 'im', 'ive', 'its', 'theres', 'youre',
    'theyre', 'every', 'already', 'never', 'always', 'pretty', 'since',
    'around', 'maybe', 'another', 'point', 'last', 'first', 'two',
    'give', 'day', 'big', 'bit', 'little', 'whole', 'part', 'start',
    'end', 'done', 'real', 'old', 'try', 'best', 'better', 'anything',
    'everything', 'nothing', 'someone', 'anyone', 'everyone', 'us'
}

# Pre-compile regex (called thousands of times)
_RE_URL = re.compile(r'http\S+|www\.\S+')
_RE_NON_ALPHA = re.compile(r'[^a-zA-Z\s]')


# ============================================================
#  CORE ANALYSIS FUNCTIONS (stateless, thread-safe)
# ============================================================

def get_sentiment(text):
    if not text:
        return 0
    return analyzer.polarity_scores(str(text))['compound']


def extract_words(text):
    """Extract meaningful words from text for frequency analysis."""
    if not text:
        return []
    text = _RE_URL.sub('', str(text))
    text = _RE_NON_ALPHA.sub('', text)
    words = text.lower().split()
    return [w for w in words if len(w) > 2 and w not in STOP_WORDS]


def make_reddit_instance():
    """Create a fresh PRAW instance. Each thread gets its own to avoid
    sharing internal HTTP session state across threads."""
    return praw.Reddit(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        user_agent=USER_AGENT,
    )


# ============================================================
#  PROGRESS TRACKER (thread-safe)
# ============================================================

class ProgressTracker:
    def __init__(self, total):
        self._lock = threading.Lock()
        self.total = total
        self.done = 0
        self.errors = 0
        self.start_time = time.time()

    def complete(self, sub_name, post_count, comment_count, error=False):
        with self._lock:
            self.done += 1
            if error:
                self.errors += 1
            elapsed = time.time() - self.start_time
            rate = self.done / elapsed if elapsed > 0 else 0
            remaining = (self.total - self.done) / rate if rate > 0 else 0
            status = "⚠️" if error else "✅"
            print(f"  {status} [{self.done:3d}/{self.total}] r/{sub_name:25s} "
                  f"| {post_count:3d} posts | {comment_count:5d} comments "
                  f"| {elapsed:.0f}s elapsed | ~{remaining:.0f}s remaining")


# ============================================================
#  SINGLE-SUBREDDIT SCRAPER (runs in a thread)
# ============================================================

def scrape_subreddit(sector, sub_name):
    """Scrape one subreddit. Returns (posts, comments, word_counter)."""
    reddit = make_reddit_instance()
    posts = []
    comments = []
    word_counter = Counter()

    subreddit = reddit.subreddit(sub_name)
    for submission in subreddit.top(time_filter="month", limit=POSTS_PER_SUB):
        created_at = datetime.fromtimestamp(submission.created_utc, timezone.utc)
        post_url = f"https://reddit.com{submission.permalink}"

        # Post sentiment
        post_text = f"{submission.title} {submission.selftext}"
        post_score = get_sentiment(post_text)
        word_counter.update(extract_words(post_text))

        # Comments — replace_more(limit=0) skips "load more" stubs entirely
        # (no extra API calls, this is the fastest option)
        submission.comments.replace_more(limit=0)
        top_comments = submission.comments[:COMMENTS_PER_POST]
        comment_scores = []

        for c in top_comments:
            c_score = get_sentiment(c.body)
            comment_scores.append(c_score)
            word_counter.update(extract_words(c.body))

            comment_url = f"https://reddit.com{c.permalink}" if hasattr(c, 'permalink') else post_url
            comment_created = datetime.fromtimestamp(c.created_utc, timezone.utc).isoformat()

            comments.append({
                "sector": sector,
                "subreddit": sub_name,
                "post_title": submission.title,
                "post_url": post_url,
                "comment_url": comment_url,
                "comment_body": c.body[:500],
                "comment_sentiment": round(c_score, 4),
                "comment_upvotes": c.score,
                "comment_date": comment_created,
            })

        avg_comm = sum(comment_scores) / len(comment_scores) if comment_scores else 0

        posts.append({
            "sector": sector,
            "subreddit": sub_name,
            "post_title": submission.title,
            "post_url": post_url,
            "post_sentiment": round(post_score, 4),
            "avg_comment_sentiment": round(avg_comm, 4),
            "combined_score": round((post_score + avg_comm) / 2, 4),
            "num_comments_analyzed": len(comment_scores),
            "post_upvotes": submission.score,
            "timestamp": created_at.isoformat(),
        })

    return posts, comments, word_counter


# ============================================================
#  CHECKPOINT SYSTEM — resume interrupted runs
# ============================================================

def load_checkpoint():
    """Load previously completed data if a checkpoint exists."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            cp = json.load(f)
        print(f"📂 CHECKPOINT FOUND — {len(cp.get('completed_subs', []))} subs already done")
        return cp
    return {"completed_subs": [], "posts": [], "comments": [], "word_frequency": {}}


def save_checkpoint(completed_subs, all_posts, all_comments, word_freq):
    """Save progress to disk so we can resume."""
    cp = {
        "completed_subs": completed_subs,
        "posts": all_posts,
        "comments": all_comments,
        "word_frequency": word_freq,
    }
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(cp, f)


def clear_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)


# ============================================================
#  MAIN COLLECTION — CONCURRENT
# ============================================================

def collect_reddit_data():
    """Scrapes all subreddits concurrently and saves raw data to JSON."""
    now = datetime.now(timezone.utc)

    # Build flat list of (sector, sub_name) tasks
    all_tasks = []
    for sector, subs in data.target_map.items():
        for sub_name in subs:
            all_tasks.append((sector, sub_name))

    # Load checkpoint (skip already-completed subs)
    cp = load_checkpoint()
    done_set = set(cp["completed_subs"])
    all_posts = cp["posts"]
    all_comments = cp["comments"]
    word_counters = {}
    for sub_name, entries in cp["word_frequency"].items():
        word_counters[sub_name] = Counter({e["word"]: e["count"] for e in entries})

    remaining_tasks = [(s, n) for s, n in all_tasks if n not in done_set]

    print("--- 🚀 STARTING DATA COLLECTION ---")
    print(f"  Total subreddits: {len(all_tasks)}")
    print(f"  Already completed: {len(done_set)}")
    print(f"  Remaining: {len(remaining_tasks)}")
    print(f"  Workers: {MAX_WORKERS}")
    print(f"  Posts/sub: {POSTS_PER_SUB}  |  Comments/post: {COMMENTS_PER_POST}")
    print()

    if not remaining_tasks:
        print("✅ All subreddits already collected (checkpoint). Delete checkpoint.json to re-run.")
    else:
        tracker = ProgressTracker(len(remaining_tasks))
        completed_since_cp = 0
        results_lock = threading.Lock()

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_task = {
                executor.submit(scrape_subreddit, sector, sub_name): (sector, sub_name)
                for sector, sub_name in remaining_tasks
            }

            for future in as_completed(future_to_task):
                sector, sub_name = future_to_task[future]
                try:
                    posts, comments, word_counter = future.result()
                    with results_lock:
                        all_posts.extend(posts)
                        all_comments.extend(comments)
                        word_counters[sub_name] = word_counter
                        done_set.add(sub_name)
                        completed_since_cp += 1
                    tracker.complete(sub_name, len(posts), len(comments))

                    # Periodic checkpoint
                    if completed_since_cp >= CHECKPOINT_EVERY:
                        with results_lock:
                            wf_serializable = {
                                sn: [{"word": w, "count": c} for w, c in ctr.most_common(50)]
                                for sn, ctr in word_counters.items()
                            }
                            save_checkpoint(list(done_set), all_posts, all_comments, wf_serializable)
                            completed_since_cp = 0
                        print(f"  💾 Checkpoint saved ({len(done_set)}/{len(all_tasks)} subs)")

                except Exception as e:
                    tracker.complete(sub_name, 0, 0, error=True)
                    print(f"    ⚠️ Error on r/{sub_name}: {e}")

    # Convert word counters to serializable dicts (top 50 per sub)
    word_freq = {}
    for sub_name, counter in word_counters.items():
        word_freq[sub_name] = [
            {"word": w, "count": c}
            for w, c in counter.most_common(50)
        ]

    raw_data = {
        "collected_at": now.isoformat(),
        "posts": all_posts,
        "comments": all_comments,
        "word_frequency": word_freq,
    }

    with open(RAW_DATA_FILE, 'w') as f:
        json.dump(raw_data, f, indent=2)

    # Clear checkpoint on successful completion
    clear_checkpoint()

    print(f"\n✅ RAW DATA SAVED TO: {RAW_DATA_FILE}")
    print(f"   Posts collected: {len(all_posts)}")
    print(f"   Comments collected: {len(all_comments)}")
    return raw_data


# ============================================================
#  REPORT GENERATION
# ============================================================

def generate_report(raw_data):
    """Processes raw data into a comprehensive report with stats + frequency analysis."""
    print("\n--- 📊 GENERATING REPORT ---")

    posts = raw_data['posts']
    comments = raw_data['comments']
    word_freq = raw_data['word_frequency']

    if not posts:
        print("❌ No posts to analyze.")
        return

    df_posts = pd.DataFrame(posts)
    df_comments = pd.DataFrame(comments)

    # --- Aggregate stats per subreddit ---
    subreddit_stats = []
    for (sector, sub), group in df_posts.groupby(['sector', 'subreddit']):
        scores = group['combined_score'].values
        comment_sub = df_comments[df_comments['subreddit'] == sub]

        if not comment_sub.empty:
            c_scores = comment_sub['comment_sentiment'].values
            positive_pct = round(float((c_scores > 0.05).sum() / len(c_scores) * 100), 1)
            negative_pct = round(float((c_scores < -0.05).sum() / len(c_scores) * 100), 1)
            neutral_pct = round(100 - positive_pct - negative_pct, 1)
            median_comment = round(float(pd.Series(c_scores).median()), 4)
        else:
            positive_pct = negative_pct = neutral_pct = 0
            median_comment = 0

        stat = {
            "sector": sector,
            "subreddit": sub,
            "num_posts": int(len(group)),
            "num_comments": int(len(comment_sub)),
            "avg_sentiment": round(float(scores.mean()), 4),
            "median_sentiment": round(float(pd.Series(scores).median()), 4),
            "std_sentiment": round(float(scores.std()), 4) if len(scores) > 1 else 0,
            "min_sentiment": round(float(scores.min()), 4),
            "max_sentiment": round(float(scores.max()), 4),
            "median_comment_sentiment": median_comment,
            "positive_comment_pct": positive_pct,
            "negative_comment_pct": negative_pct,
            "neutral_comment_pct": neutral_pct,
            "avg_post_upvotes": round(float(group['post_upvotes'].mean()), 1),
            "most_recent": group['timestamp'].max(),
            "least_recent": group['timestamp'].min(),
            "top_words": word_freq.get(sub, [])[:20],
        }
        subreddit_stats.append(stat)

    subreddit_stats.sort(key=lambda x: x['avg_sentiment'], reverse=True)
    for i, s in enumerate(subreddit_stats):
        s['rank'] = i + 1

    # --- Sector-level aggregation ---
    sector_stats = []
    for sector, group in df_posts.groupby('sector'):
        scores = group['combined_score'].values
        sector_comments = df_comments[df_comments['sector'] == sector]
        sector_stats.append({
            "sector": sector,
            "num_subreddits": int(group['subreddit'].nunique()),
            "num_posts": int(len(group)),
            "num_comments": int(len(sector_comments)),
            "avg_sentiment": round(float(scores.mean()), 4),
            "median_sentiment": round(float(pd.Series(scores).median()), 4),
        })
    sector_stats.sort(key=lambda x: x['avg_sentiment'], reverse=True)

    # --- Global top words ---
    global_counter = Counter()
    for sub_words in word_freq.values():
        for entry in sub_words:
            global_counter[entry['word']] += entry['count']
    global_top_words = [{"word": w, "count": c} for w, c in global_counter.most_common(30)]

    report = {
        "generated_at": raw_data['collected_at'],
        "summary": {
            "total_posts": len(posts),
            "total_comments": len(comments),
            "total_subreddits": len(subreddit_stats),
            "overall_avg_sentiment": round(float(df_posts['combined_score'].mean()), 4),
            "overall_median_sentiment": round(float(df_posts['combined_score'].median()), 4),
            "global_top_words": global_top_words,
        },
        "sector_stats": sector_stats,
        "subreddit_stats": subreddit_stats,
    }

    with open(REPORT_FILE, 'w') as f:
        json.dump(report, f, indent=2)

    # --- Generate JS data file (no indent = much smaller file) ---
    js_data = {
        "report": report,
        "comments": comments,
    }

    with open(JS_DATA_FILE, 'w') as f:
        f.write("// Auto-generated by reddit_sentiment.py\n")
        f.write(f"const SENTIMENT_DATA = {json.dumps(js_data)};\n")

    print(f"\n✅ REPORT SAVED TO: {REPORT_FILE}")
    print(f"✅ JS DATA FILE SAVED TO: {JS_DATA_FILE}")

    # Print summary
    print("\n--- 📈 SUMMARY ---")
    print(f"  Total Posts Analyzed: {len(posts)}")
    print(f"  Total Comments Analyzed: {len(comments)}")
    print(f"  Overall Avg Sentiment: {report['summary']['overall_avg_sentiment']}")
    print(f"  Overall Median Sentiment: {report['summary']['overall_median_sentiment']}")

    print("\n--- 🏆 RANKED SUBREDDITS ---")
    for s in subreddit_stats:
        emoji = "🟢" if s['avg_sentiment'] > 0.1 else "🔴" if s['avg_sentiment'] < -0.1 else "🟡"
        print(f"  #{s['rank']:2d} {emoji} r/{s['subreddit']:25s} ({s['sector']:20s}) | "
              f"Avg: {s['avg_sentiment']:+.4f} | "
              f"Posts: {s['num_posts']:4d} | "
              f"Comments: {s['num_comments']:5d} | "
              f"+{s['positive_comment_pct']}% / -{s['negative_comment_pct']}%")

    print(f"\n--- 🔤 TOP 10 GLOBAL WORDS ---")
    for entry in global_top_words[:10]:
        print(f"  {entry['word']:15s} → {entry['count']}")


# ============================================================
#  ENTRY POINT
# ============================================================

if __name__ == "__main__":
    t0 = time.time()

    # 1. Collect (concurrent)
    raw_data = collect_reddit_data()

    # 2. Analyze & generate report + JS file
    if raw_data['posts']:
        generate_report(raw_data)
    else:
        print("❌ No data collected. Check API credentials or internet connection.")

    elapsed = time.time() - t0
    print(f"\n⏱️  Total runtime: {elapsed:.1f}s ({elapsed/60:.1f} min)")