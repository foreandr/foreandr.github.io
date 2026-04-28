import os
import pickle
import config  # Import the global config
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.auth.transport.requests import Request

def get_authenticated_service():
    scopes = ["https://www.googleapis.com/auth/youtube.upload"]
    credentials = None
    
    # Look for token in the shared parent folder
    token_path = os.path.join(config.BASE_DIR, "token.pickle")
    
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            credentials = pickle.load(token)

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            # Use the global client_secrets path from config.py
            flow = InstalledAppFlow.from_client_secrets_file(config.CLIENT_SECRETS, scopes)
            credentials = flow.run_local_server(port=0)
        with open(token_path, 'wb') as token:
            pickle.dump(credentials, token)

    return build("youtube", "v3", credentials=credentials)

def format_custom_title(raw_title):
    """
    Format logic:
    BEFORE ':' -> ALL CAPS
    AFTER ':'  -> Title Case
    """
    if ":" in raw_title:
        source_part, indicator_part = raw_title.split(":", 1)
        # Clean underscores and apply specific casing
        formatted = f"{source_part.strip().replace('_', ' ').upper()}: {indicator_part.strip().replace('_', ' ').title()}"
    else:
        # Fallback if no colon: First word UPPER, rest Title Case
        words = raw_title.replace("_", " ").split()
        if words:
            words[0] = words[0].upper()
            if len(words) > 1:
                words[1:] = [w.title() for w in words[1:]]
            formatted = " ".join(words)
        else:
            formatted = raw_title
    
    # YouTube titles are capped at 100 chars
    return formatted[:100]

# Change this line to include description
def upload_to_youtube(video_path, title, description, thumbnail_path):
    try:
        youtube = get_authenticated_service()
        formatted_title = format_custom_title(title)
        
        request_body = {
            'snippet': {
                'title': formatted_title,
                'description': description, # Now using the variable passed from assembler
                'categoryId': '27' 
            },
            'status': {'privacyStatus': 'public'}
        }

        print(f"Uploading to YouTube API: {formatted_title}")
        media = MediaFileUpload(video_path, chunksize=-1, resumable=True)
        upload_request = youtube.videos().insert(part="snippet,status", body=request_body, media_body=media)
        
        response = upload_request.execute()
        video_id = response.get("id")
        
        # Set Thumbnail
        youtube.thumbnails().set(videoId=video_id, media_body=MediaFileUpload(thumbnail_path)).execute()
        
        print(f"API Upload Success! Video ID: {video_id}")
        return video_id # Return the ID so history_manager can log it
    except Exception as e:
        print(f"FAILED TO UPLOAD IN OG: {e}")
        return False