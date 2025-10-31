import re
import os

try:
    from email_system import get_latest_youtube_live_url
except ImportError:
    def get_latest_youtube_live_url():
        print("❌ CRITICAL ERROR: Could not import 'get_latest_youtube_live_url' from 'email_system.py'.")
        return None


def update_live_url():
    print("\n--- Next Action: Update JS File ---")
    
    url = get_latest_youtube_live_url()

    if not url:
        print("❌ Aborting JS update: Could not retrieve a valid live URL.")
        return

    url_id_regex = r"/live/([^?&\s]+)"
    
    match = re.search(url_id_regex, url)
    video_id = None

    if match:
        video_id = match.group(1)
    print("GOT THE VIDEO ID:", video_id)
    if not video_id:
        print(f"❌ Aborting JS update: Could not parse video ID from retrieved URL: {url}")
        return

    html_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'html', 'lot_tracker.html')

    search_pattern = r'src="https://www\.youtube\.com/embed/[^"]+"'
    replacement_string = f'src="https://www.youtube.com/embed/{video_id}"'

    try:
        with open(html_file_path, 'r') as f:
            content = f.read()

        # Fixed Deprecation Warning: using keyword argument 'count=1'
        new_content = re.sub(search_pattern, replacement_string, content, count=1)

        # Check if the content changed before writing
        if new_content != content:
            with open(html_file_path, 'w') as f:
                f.write(new_content)
            
            print(f"✅ SUCCESS: Updated '{html_file_path}' with new Video ID: {video_id}")
            print(f"ℹ️ Full URL retrieved: {url}")
            print(f"✅ Extracted VIDEO ID (for file use): {video_id}")
        # If content is the same (ID was already present OR pattern didn't match),
        # the script will now complete silently, fulfilling the request.

    except FileNotFoundError:
        print(f"❌ ERROR: Target HTML file not found at: {html_file_path}")
    except Exception as e:
        print(f"❌ ERROR during file modification: {e}")
    
if __name__ == '__main__':
    update_live_url()
