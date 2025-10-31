# email_system.py

import imaplib
import email
from email.header import decode_header
import json
import os
import re

def get_latest_youtube_live_url():
    """
    Connects to Gmail, searches for the latest email from YouTube, 
    and extracts the live stream URL using regex.
    Returns: The extracted YouTube live URL (str) or None if not found.
    """
    # --- Configuration Loading ---
    # Assume config.json is two levels up from this script's location
    script_dir = os.path.dirname(__file__) or '.'
    config_path = os.path.join(script_dir, '..', 'config.json')

    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        EMAIL = config.get("EMAIL")
        APP_PASSWORD = config.get("APP_PASSWORD")

        if not EMAIL or not APP_PASSWORD:
            raise ValueError("EMAIL or APP_PASSWORD not found in config.json")

    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        return None
    # -----------------------------

    mail = None
    try:
        # Initialize IMAP connection and login
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(EMAIL, APP_PASSWORD)
        mail.select("inbox")

        # 🔍 search for emails from YouTube
        status, data = mail.search(None, '(FROM "youtube.com")')

        if status != "OK" or not data[0]:
            print("❌ No messages found from YouTube.")
            return None

        ids = data[0].split()
        latest_id = ids[-1]

        status, msg_data = mail.fetch(latest_id, "(RFC822)")
        if status != "OK":
            print("❌ Error fetching message.")
            return None
            
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)

        # Decode body (prioritizing text/plain)
        body_text = None
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                disp = str(part.get("Content-Disposition"))
                if ctype == "text/plain" and "attachment" not in disp:
                    body_text = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                    break
        else:
            body_text = msg.get_payload(decode=True).decode("utf-8", errors="ignore")

        # --- YouTube URL Extraction Logic ---
        if body_text:
            youtube_live_regex = r"(https?://(?:www\.)?youtube\.com/live/[^\s]+)"
            match = re.search(youtube_live_regex, body_text)
            
            if match:
                print("✅ Email data fetched and URL extracted successfully.")
                return match.group(0)
            else:
                print("❌ Live URL not found in the email body.")
                return None
        else:
            print("❌ No readable text body found in the email.")
            return None

    except Exception as e:
        print(f"❌ An error occurred during email processing: {e}")
        return None
        
    finally:
        if mail:
            mail.logout()