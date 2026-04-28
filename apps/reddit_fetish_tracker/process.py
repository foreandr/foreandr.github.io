import praw
import csv
import json
import time
import os
import signal
import sys
from datetime import datetime, timezone
from prawcore.exceptions import TooManyRequests

# --- CONFIG ---
CLIENT_ID = "hvHilV5J_dC-8w"
CLIENT_SECRET = "9BJjQlNX4D-56JRlk-B27efgw9c"
USER_AGENT = "SubredditStatsBot v1.0"

CSV_INPUT = "subreddits.csv"
JS_OUTPUT = "subreddit_stats.js"
LOG_FILE = "incremental_results.log"

reddit = praw.Reddit(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    user_agent=USER_AGENT,
)

def finalize_js():
    """Reads the log and saves the sorted JS file."""
    all_stats = []
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                try: all_stats.append(json.loads(line))
                except: continue
    
    all_stats.sort(key=lambda x: x.get('subscribers', 0), reverse=True)
    for i, s in enumerate(all_stats): s['rank'] = i + 1

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(all_stats),
        "subreddits": all_stats
    }
    with open(JS_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(f"const SUBREDDIT_DATA = {json.dumps(output, indent=2)};")

def signal_handler(sig, frame):
    print("\nStopping... Finalizing JS file.")
    finalize_js()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def main():
    # 1. Load subreddits
    if not os.path.exists(CSV_INPUT):
        print(f"Missing {CSV_INPUT}"); return

    with open(CSV_INPUT, 'r', encoding='utf-8') as f:
        subs = list(csv.DictReader(f))

    # 2. Check progress
    done = set()
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                try: done.add(json.loads(line)['path'])
                except: continue

    print(f"Remaining: {len(subs) - len(done)}")

    # 3. Process one by one
    for row in subs:
        try:
            path = row.get('Path') or row.get('path')
            if path in done: continue

            name = path.strip('/').split('/')[-1].replace('-', '')
            
            try:
                sub = reddit.subreddit(name)
                data = {
                    "name": sub.display_name,
                    "path": path,
                    "subscribers": sub.subscribers,
                    "title": sub.title,
                    "url": f"https://reddit.com/r/{sub.display_name}"
                }
                
                # Save to log
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(json.dumps(data) + "\n")
                
                # Update JS file immediately
                finalize_js()
                print(f"Done: r/{sub.display_name}")
                done.add(path)

            except TooManyRequests:
                print("\n429 Hit. Waiting 10 minutes...")
                for i in range(600, 0, -1):
                    sys.stdout.write(f"\rRestarting in {i}s... ")
                    sys.stdout.flush()
                    time.sleep(1)
                print("\nResuming...")
                # Retry the current one
                continue 

            except Exception as e:
                print(f"Error r/{name}: {e}")
                continue
        except Exception as e:
            continue

if __name__ == "__main__":
    main()