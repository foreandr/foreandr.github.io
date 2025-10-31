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
    print("Attempting to get authenticated service...")
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

    # NOTE: Thumbnail setting logic remains unchanged, but is optional in the upload call.
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
    """Uploads a video to YouTube from raw bytes."""
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
        return False

def convert_mkv_to_mp4(mkv_filepath):
    """
    Converts an MKV file to a temporary MP4 file using FFmpeg.
    Returns the path to the temporary MP4 file on success, or None on failure.
    """
    temp_mp4_filepath = mkv_filepath.replace('.mkv', '.temp.mp4')
    print(f"Starting MKV conversion to: {os.path.basename(temp_mp4_filepath)}")

    command = [
        FFMPEG_PATH,
        '-i', mkv_filepath,
        '-c', 'copy',
        temp_mp4_filepath
    ]

    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=300)

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

def get_newest_mkv_or_mp4_file(directory):
    """Finds the newest MKV or MP4 file in the given directory, skipping temp files."""
    if not os.path.isdir(directory):
        print(f"\nError: Video directory '{directory}' not found.")
        return None
        
    files = [
        os.path.join(directory, f)
        for f in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, f)) and 
           f.lower().endswith(('.mkv', '.mp4', '.mov', '.avi', '.webm')) and 
           '.temp.mp4' not in f.lower() # Skip temporary files
    ]
    
    if not files:
        return None
    
    # Sort files by modification time (newest first)
    files.sort(key=os.path.getmtime, reverse=True)
    return files[0]

def process_and_upload_latest_file(service):
    """
    Finds the latest recorded segment, converts it if necessary, uploads it,
    and then deletes the local files. This function runs in a separate thread.
    """
    if not service:
        print("Upload process skipped: YouTube service is not authenticated.")
        return

    print("\n--- Starting File Uploader Process ---")
    filepath = get_newest_mkv_or_mp4_file(VIDEO_DIRECTORY)
    
    if not filepath:
        print("⚠️ No new video files found to upload in the Video directory.")
        return

    filename = os.path.basename(filepath)
    original_filepath = filepath
    temp_mp4_path = None
    upload_success = False

    print(f"Found latest file: {filename}")

    try:
        # 1. Handle Conversion if it's an MKV file
        if filename.lower().endswith('.mkv'):
            temp_mp4_path = convert_mkv_to_mp4(filepath)
            if temp_mp4_path is None:
                print(f"Skipping '{filename}' due to conversion failure.")
                return
            filepath = temp_mp4_path
        
        # 2. Prepare Metadata
        mod_timestamp = os.path.getmtime(original_filepath) # Use the original file time
        mod_datetime = datetime.fromtimestamp(mod_timestamp)
        video_title = f"PARKING LOT {mod_datetime.strftime('%Y-%m-%d %H:%M:%S')}"
        
        # 3. Read the video file into bytes
        with open(filepath, 'rb') as f:
            mp4_raw_data = f.read()

        # 4. Upload the video
        upload_success = upload_video(
            service=service,
            mp4_raw=mp4_raw_data,
            title=video_title,
            description=f"Automated upload of parking lot footage from {mod_datetime.strftime('%Y-%m-%d at %H:%M:%S')}.",
            privacy_status='public'
        )

    except Exception as e:
        print(f"Critical error during upload or file read: {e}")
        upload_success = False
    
    finally:
        # 5. Delete Files on successful upload
        if upload_success:
            # Delete the temporary MP4 file if it exists
            if temp_mp4_path and os.path.exists(temp_mp4_path):
                try:
                    os.remove(temp_mp4_path)
                    print(f"Successfully deleted temporary file: {os.path.basename(temp_mp4_path)}")
                except OSError as e:
                    print(f"Error deleting temporary MP4 file {os.path.basename(temp_mp4_path)}: {e}")
            
            # Delete the original file (MKV or MP4)
            if os.path.exists(original_filepath):
                try:
                    os.remove(original_filepath)
                    print(f"Successfully deleted original file: {os.path.basename(original_filepath)}")
                except OSError as e:
                    print(f"Error deleting original file {os.path.basename(original_filepath)}: {e}")
        else:
            print("❌ Upload failed. Local files were preserved for manual inspection.")

if __name__ == '__main__':
    # This section is for standalone testing of the uploader, but is not used
    # by obs_python.py. Keeping it for completeness as in your original file.
    service = get_authenticated_service()
    if service:
        process_and_upload_latest_file(service)