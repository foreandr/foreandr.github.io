import os.path
import json

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.json.
# This scope allows full write access to YouTube data, including uploading videos.
# We also need the 'youtube.readonly' scope to list channels.
SCOPES = ['https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly']

def get_authenticated_service():
    """
    Authenticates with Google and returns an authenticated YouTube service object.
    It handles loading/saving tokens and initiating the OAuth flow if needed.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Load client secrets from google_credentials.json
            try:
                with open('google_credentials.json', 'r') as f:
                    client_config = json.load(f)
            except FileNotFoundError:
                print("Error: google_credentials.json not found.")
                print("Please ensure 'google_credentials.json' is in the same directory.")
                return None

            # Create an InstalledAppFlow instance.
            # The 'InstalledAppFlow.from_client_config' method expects the client config
            # to be structured like the JSON downloaded from Google Cloud Console.
            flow = InstalledAppFlow.from_client_config(
                client_config, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    # Build and return the YouTube API service.
    # 'youtube', 'v3' are the service name and version.
    return build('youtube', 'v3', credentials=creds)

def list_channels(service):
    """
    Lists the YouTube channels associated with the authenticated account.

    Args:
        service: An authenticated Google API service object (YouTube v3).
    """
    print("\nFetching channels connected to your account...")
    try:
        # Call the channels.list method to retrieve channel information.
        # 'mine=True' indicates to retrieve channels owned by the authenticated user.
        # 'part=snippet' requests the snippet part of the channel resource, which includes title and description.
        response = service.channels().list(
            part='snippet',
            mine=True
        ).execute()

        if 'items' in response and response['items']:
            print("Your YouTube Channels:")
            for item in response['items']:
                channel_id = item['id']
                channel_title = item['snippet']['title']
                print(f"  - Title: '{channel_title}' (ID: {channel_id})")
        else:
            print("No channels found for this account.")
    except Exception as e:
        print(f"Error fetching channel list: {e}")

if __name__ == '__main__':
    # This block is for testing the authentication process and listing channels.
    print("Attempting to get authenticated service...")
    service = get_authenticated_service()
    if service:
        print("Authentication successful! Service object created.")
        list_channels(service) # Call the new function to list channels
    else:
        print("Authentication failed.")