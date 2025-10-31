import re
import os
import shutil

# Try to import the real function; fall back to a dummy if it's not available
try:
    from email_system import get_latest_youtube_live_url
except ImportError:
    def get_latest_youtube_live_url():
        print("❌ CRITICAL ERROR: Could not import 'get_latest_youtube_live_url' from 'email_system.py'.")
        return None


def update_live_url():
    print("\n--- Next Action: Update html/lot_tracker.html → make html/lot_tracker2.html → MOVE it OUTSIDE py_prog ---")

    # ─────────────────────────────────────────────────────────────────────────────
    # DIRECTORY LAYOUT WE ARE ASSUMING FROM YOUR MESSAGE:
    #
    # C:\Users\forea\Documents\Portfolio\py_prog        ← this script is here
    # C:\Users\forea\Documents\Portfolio\html\...       ← html/ is ONE UP from py_prog
    # C:\Users\forea\Documents\Portfolio\lot_tracker2.html  ← FINAL DESTINATION
    #
    # i.e. you said: "it should be one folder.. back from py_prog"
    # so final = parent_of(py_prog) / "lot_tracker2.html"
    # ─────────────────────────────────────────────────────────────────────────────

    # base_dir = ...\Portfolio\py_prog
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # html_dir = ...\Portfolio\html
    html_dir = os.path.abspath(os.path.join(base_dir, "..", "html"))
    os.makedirs(html_dir, exist_ok=True)

    # source templates
    lot_tracker_path = os.path.join(html_dir, "lot_tracker.html")
    lot_tracker2_inner = os.path.join(html_dir, "lot_tracker2.html")  # temp inside html

    # FINAL destination: one folder OUTSIDE py_prog
    # parent_dir = ...\Portfolio
    parent_dir = os.path.abspath(os.path.join(base_dir, ".."))
    final_lot_tracker2 = os.path.join(parent_dir, "lot_tracker2.html")

    # 1. get URL
    url = get_latest_youtube_live_url()
    if not url:
        print("❌ Aborting YouTube update: Could not retrieve a valid live URL.")
        return

    # 2. extract video id
    url_id_regex = r"/live/([^?&\s]+)"
    match = re.search(url_id_regex, url)
    video_id = match.group(1) if match else None
    print("GOT THE VIDEO ID:", video_id)

    if not video_id:
        print(f"❌ Aborting HTML update: Could not parse video ID from retrieved URL: {url}")
        return

    # 3. update (or create) html/lot_tracker.html
    search_pattern = r'src="https://www\.youtube\.com/embed/[^"]+"'
    replacement_string = f'''src=\"https://www.youtube.com/embed/{video_id}\"'''
    final_lot_tracker_content = ""

    try:
        with open(lot_tracker_path, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = re.sub(search_pattern, replacement_string, content, count=1)

        if new_content != content:
            with open(lot_tracker_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"✅ SUCCESS: Updated '{lot_tracker_path}' with new Video ID: {video_id}")
        else:
            print(f"ℹ️ NOTE: No change detected in '{lot_tracker_path}' (embed was already up to date).")

        final_lot_tracker_content = new_content

    except FileNotFoundError:
        print(f"❗ '{lot_tracker_path}' not found. Creating a new one with the current video embed.")
        minimal_html = (
            "<!DOCTYPE html>\n"
            "<html>\n"
            "  <head>\n"
            "    <meta charset=\"utf-8\" />\n"
            "    <title>Lot Tracker</title>\n"
            "  </head>\n"
            "  <body>\n"
            "    <a id=\"home-button\" href=\"index.html\" "
            "style=\"display:inline-block;padding:8px 16px;background:#3498db;color:#fff;"
            "text-decoration:none;border-radius:4px;margin-bottom:16px;\">Home</a>\n"
            f"    <iframe width=\"100%\" height=\"550\" "
            f"src=\"https://www.youtube.com/embed/{video_id}\" "
            "title=\"Lot Tracker Live\" frameborder=\"0\" "
            "allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" "
            "allowfullscreen></iframe>\n"
            "  </body>\n"
            "</html>\n"
        )
        with open(lot_tracker_path, "w", encoding="utf-8") as f:
            f.write(minimal_html)
        final_lot_tracker_content = minimal_html
        print(f"✅ CREATED: '{lot_tracker_path}' with current video.")

    except Exception as e:
        print(f"❌ ERROR updating '{lot_tracker_path}': {e}")
        return

    # 4. write html/lot_tracker2.html (temporary inside html/)
    try:
        with open(lot_tracker2_inner, "w", encoding="utf-8") as f:
            f.write(final_lot_tracker_content)
        print(f"✅ SUCCESS: Cloned updated '{lot_tracker_path}' → '{lot_tracker2_inner}'")
    except Exception as e:
        print(f"❌ ERROR writing inner '{lot_tracker2_inner}': {e}")
        return

    # 5. MOVE that file OUTSIDE py_prog to its parent (…\Portfolio\lot_tracker2.html)
    try:
        # make sure parent dir exists (it should, but let's be safe)
        os.makedirs(parent_dir, exist_ok=True)

        # if there's already a lot_tracker2.html in the parent, delete it first
        if os.path.exists(final_lot_tracker2):
            os.remove(final_lot_tracker2)
            print(f"ℹ️ Removed existing '{final_lot_tracker2}' to replace it.")

        shutil.move(lot_tracker2_inner, final_lot_tracker2)
        print(f"✅ SUCCESS: MOVED '{lot_tracker2_inner}' → '{final_lot_tracker2}'")
    except Exception as e:
        print(f"❌ ERROR MOVING '{lot_tracker2_inner}' to '{final_lot_tracker2}': {e}")
        return

    print("✅ DONE: html/lot_tracker.html updated, html/lot_tracker2.html created, and then MOVED one folder OUTSIDE py_prog.")


if __name__ == "__main__":
    update_live_url()
