import re
import os

# Try to import the real function; fall back to a dummy if it's not available
try:
    from email_system import get_latest_youtube_live_url
except ImportError:
    def get_latest_youtube_live_url():
        print("❌ CRITICAL ERROR: Could not import 'get_latest_youtube_live_url' from 'email_system.py'.")
        return None


def update_live_url():
    print("\n--- Next Action: Update HTML File(s) ---")

    # 1. Get the latest YouTube Live URL from your email system
    url = get_latest_youtube_live_url()

    if not url:
        print("❌ Aborting HTML update: Could not retrieve a valid live URL.")
        return

    # 2. Extract the video ID from a URL that looks like https://www.youtube.com/live/XXXXXXXXX
    url_id_regex = r"/live/([^?&\s]+)"
    match = re.search(url_id_regex, url)
    video_id = None

    if match:
        video_id = match.group(1)

    print("GOT THE VIDEO ID:", video_id)

    if not video_id:
        print(f"❌ Aborting HTML update: Could not parse video ID from retrieved URL: {url}")
        return

    # 3. Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_dir = os.path.join(base_dir, "..", "html")

    # You said: "infact lets call it instead 'lot_tracker2'"
    # So we now target 'lot_tracker2.html' instead of 'lot_tracker.html'
    lot_tracker_path = os.path.join(html_dir, "lot_tracker2.html")

    # You also said: "this code also needs to completely wipe whatever the current 'landlord_raw_url'.html file is
    # and make it an exact copy of whatever the new lot tracker is"
    landlord_raw_path = os.path.join(html_dir, "landlord_raw_url.html")

    # 4. Regex to find the existing YouTube embed in the lot tracker file
    search_pattern = r'src="https://www\.youtube\.com/embed/[^"]+"'
    replacement_string = f'src="https://www.youtube.com/embed/{video_id}"'

    try:
        # 5. Read the existing lot_tracker2.html
        with open(lot_tracker_path, "r", encoding="utf-8") as f:
            content = f.read()

        # 6. Replace ONLY the first occurrence of the YouTube embed src
        new_content = re.sub(search_pattern, replacement_string, content, count=1)

        # 7. If content changed, write it back to lot_tracker2.html
        if new_content != content:
            with open(lot_tracker_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"✅ SUCCESS: Updated '{lot_tracker_path}' with new Video ID: {video_id}")
            print(f"ℹ️ Full URL retrieved: {url}")
        else:
            # If it didn't change, we can still proceed to copy it to landlord_raw_url.html
            print(f"ℹ️ NOTE: No change detected in '{lot_tracker_path}' (embed was already up to date).")

        # 8. Now COMPLETELY WIPE landlord_raw_url.html and make it an EXACT COPY of the updated lot_tracker2.html
        #    This satisfies: "completely wipe whatever the current 'landlord_raw_url'.html file is"
        with open(landlord_raw_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"✅ SUCCESS: Overwrote '{landlord_raw_path}' with the exact contents of '{lot_tracker_path}'")

        # 9. Final confirmation
        print("✅ DONE: lot_tracker2.html updated (or confirmed), landlord_raw_url.html reset to match it.")

    except FileNotFoundError:
        print(f"❌ ERROR: Target HTML file not found at: {lot_tracker_path}")
        print("➡️ Make sure '../html/lot_tracker2.html' exists, since we renamed it from the original file.")
    except Exception as e:
        print(f"❌ ERROR during file modification: {e}")


if __name__ == "__main__":
    update_live_url()
