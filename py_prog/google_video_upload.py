import os
import os.path
import json
import time
import io
import subprocess # Required for calling FFmpeg
from datetime import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# --- Configuration ---
# DYNAMICALLY FIND THE USER'S VIDEOS FOLDER
HOME_DIR = os.path.expanduser('~')
VIDEO_DIRECTORY = os.path.join(HOME_DIR, 'Videos') 
SCOPES = ['https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly']

# FFmpeg Configuration
# Explicit path to the FFmpeg executable relative to where you run this script
FFMPEG_PATH = os.path.abspath('../ffmpeg/bin/ffmpeg')
# ---------------------

# --- Authentication and Upload Helper Functions ---

def get_authenticated_service():
    """Authenticates with Google and returns an authenticated YouTube service object."""
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            try:
                with open('google_credentials.json', 'r') as f:
                    client_config = json.load(f)
            except FileNotFoundError:
                print("Error: google_credentials.json not found.")
                print("Please ensure 'google_credentials.json' is in the same directory.")
                return None
            
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('youtube', 'v3', credentials=creds)

def set_video_thumbnail(service, video_id: str, thumbnail_bytes: bytes):
    """Sets a custom thumbnail for a YouTube video from raw bytes."""
    if not thumbnail_bytes:
        return

    print(f"Attempting to set thumbnail for video ID '{video_id}'...")
    
    thumbnail_stream = io.BytesIO(thumbnail_bytes)
    media_body = MediaIoBaseUpload(thumbnail_stream, mimetype='image/jpeg', resumable=True)

    while True:
        try:
            request = service.thumbnails().set(
                videoId=video_id,
                media_body=media_body
            )
            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    print(f"Thumbnail upload progress: {int(status.resumable_progress * 100)}%")

            print(f"Thumbnail successfully set for video ID: {video_id}")
            break
        except Exception as e:
            print(f"An error occurred during thumbnail upload: {e}. Retrying in 60 seconds...")
            time.sleep(60)

def upload_video(service, mp4_raw, title, description, privacy_status, thumbnail_bytes=None):
    """Uploads a video to YouTube from raw bytes and optionally sets a thumbnail."""
    if not mp4_raw:
        print("Error: 'mp4_raw' bytes cannot be empty.")
        return False

    mp4_stream = io.BytesIO(mp4_raw)
    media_body = MediaIoBaseUpload(mp4_stream, mimetype='video/mp4', resumable=True)

    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': ['parking lot', 'cctv', 'upload', 'automated'],
            'categoryId': '22' # People & Blogs
        },
        'status': {
            'privacyStatus': privacy_status
        }
    }

    print(f"Attempting to upload video: '{title}' (Size: {len(mp4_raw)/(1024*1024):.2f} MB)...")

    try:
        request = service.videos().insert(
            part='snippet,status',
            body=body,
            media_body=media_body
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                print(f"Uploaded {int(status.resumable_progress * 100)}%")

        video_id = response.get('id')
        print(f"Video '{title}' uploaded successfully! Video ID: {video_id}")
        print(f"Watch it here: https://www.youtube.com/watch?v={video_id}")

        if thumbnail_bytes:
            set_video_thumbnail(service, video_id, thumbnail_bytes)
                
        return True
    except Exception as e:
        print(f"An error occurred during video upload: {e}...")
        print("Upload failed, waiting long before exit.")
        time.sleep(600)
        return False

# --- FFmpeg Conversion Function ---

def convert_mkv_to_mp4(mkv_filepath):
    """
    Converts an MKV file to a temporary MP4 file using FFmpeg.
    Returns the path to the temporary MP4 file on success, or None on failure.
    """
    temp_mp4_filepath = mkv_filepath.replace('.mkv', '.temp.mp4')
    print(f"Starting MKV conversion to: {os.path.basename(temp_mp4_filepath)}")

    # FFmpeg command: -i <input> -c copy <output> (fast stream copy)
    command = [
        FFMPEG_PATH,
        '-i', mkv_filepath,
        '-c', 'copy',
        temp_mp4_filepath
    ]

    try:
        # Use subprocess to run the FFmpeg command
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=300) # 5-minute timeout

        if result.returncode == 0:
            print("Conversion successful.")
            return temp_mp4_filepath
        else:
            print(f"FFmpeg failed with return code {result.returncode}.")
            print(f"FFmpeg Error Output: {result.stderr}")
            return None

    except FileNotFoundError:
        print(f"Error: FFmpeg executable not found at '{FFMPEG_PATH}'.")
        return None
    except subprocess.CalledProcessError as e:
        print(f"Conversion command failed: {e}")
        print(f"FFmpeg Error Output: {e.stderr}")
        return None
    except subprocess.TimeoutExpired:
        print("FFmpeg conversion timed out after 5 minutes.")
        return None

# --- Main Execution Logic ---

if __name__ == '__main__':
    print("Attempting to get authenticated service...")
    service = get_authenticated_service()

    if not service:
        print("Authentication failed. Cannot proceed with upload.")
    else:
        print("Authentication successful! Starting video scanning and upload.")
        print(f"Looking for videos in: {VIDEO_DIRECTORY}")
        
        if not os.path.isdir(VIDEO_DIRECTORY):
            print(f"\nError: Video directory '{VIDEO_DIRECTORY}' not found.")
            print("Please ensure this standard 'Videos' folder exists or update the script.")
            exit()

        files_to_process = os.listdir(VIDEO_DIRECTORY)
        uploaded_count = 0
        
        if not files_to_process:
            print(f"\nNo files found in the '{VIDEO_DIRECTORY}' directory. Nothing to upload.")

        for filename in files_to_process:
            filepath = os.path.join(VIDEO_DIRECTORY, filename)
            
            # Skip folders and desktop.ini
            if not os.path.isfile(filepath) or filename.lower() == 'desktop.ini':
                continue
            
            original_filepath = filepath
            temp_mp4_path = None
            
            # 1. Handle Conversion if it's an MKV file
            if filename.lower().endswith('.mkv'):
                temp_mp4_path = convert_mkv_to_mp4(filepath)
                if temp_mp4_path is None:
                    print(f"Skipping '{filename}' due to conversion failure.")
                    continue
                # Update the path to the new MP4 file for reading
                filepath = temp_mp4_path
                print(f"Successfully converted. Preparing to upload {os.path.basename(filepath)}.")

            # 2. Check for supported video extensions (MP4 is now the target)
            elif not filename.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
                print(f"Skipping '{filename}': Not a supported video file format for direct upload.")
                continue

            print(f"\n--- Preparing to process: {os.path.basename(filepath)} ---")

            try:
                # 3. Get the modification time and format the title
                mod_timestamp = os.path.getmtime(original_filepath) # Use the original file time
                mod_datetime = datetime.fromtimestamp(mod_timestamp)
                
                video_title = f"PARKING LOT {mod_datetime.strftime('%Y-%m-%d %H:%M:%S')}"
                
                # 4. Read the video file into bytes (either original MP4 or temporary MP4)
                with open(filepath, 'rb') as f:
                    mp4_raw_data = f.read()

                # 5. Upload the video
                upload_success = upload_video(
                    service=service,
                    mp4_raw=mp4_raw_data,
                    title=video_title,
                    description=f"Automated upload of parking lot footage from {mod_datetime.strftime('%Y-%m-%d at %H:%M:%S')}.",
                    privacy_status='public', # <--- CHANGED TO 'public'
                    thumbnail_bytes=None
                )

                if upload_success:
                    uploaded_count += 1
                    
                    # 6. DELETE BOTH FILES if conversion occurred, or just the original otherwise
                    if temp_mp4_path:
                        # Delete the temporary MP4 file
                        try:
                            os.remove(temp_mp4_path)
                            print(f"Successfully deleted temporary file: {os.path.basename(temp_mp4_path)}")
                        except OSError as e:
                            print(f"Error deleting temporary MP4 file {os.path.basename(temp_mp4_path)}: {e}")
                        
                        # Delete the original MKV file
                        try:
                            os.remove(original_filepath)
                            print(f"Successfully deleted original file: {os.path.basename(original_filepath)}")
                        except OSError as e:
                            print(f"Error deleting original MKV file {os.path.basename(original_filepath)}: {e}")
                    else:
                        # Delete the original MP4/MOV/etc. file
                        try:
                            os.remove(original_filepath)
                            print(f"Successfully deleted local file: {os.path.basename(original_filepath)}")
                        except OSError as e:
                            print(f"Error deleting file {os.path.basename(original_filepath)}: {e}")
                
            except Exception as e:
                print(f"Critical error processing file {os.path.basename(original_filepath)}: {e}")

        print(f"\n--- Script Finished ---")
        print(f"Total files scanned: {len(files_to_process)}")
        print(f"Total successful uploads: {uploaded_count}")