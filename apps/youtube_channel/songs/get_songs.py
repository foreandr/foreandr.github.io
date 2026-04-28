import yt_dlp
import random
import os

def download_random_mp3s(channel_url, n_target):
    # 1. Scrape the list of URLs from the channel
    list_opts = {
        'extract_flat': True,  # Don't download yet, just get the metadata
        'quiet': True,
    }

    print(f"Fetching video list from {channel_url}...")
    with yt_dlp.YoutubeDL(list_opts) as ydl:
        channel_info = ydl.extract_info(channel_url, download=False)
        video_entries = channel_info.get('entries', [])

    if not video_entries:
        print("No videos found. Check the URL.")
        return

    # 2. Randomize the list
    random.shuffle(video_entries)

    # 3. Download loop
    downloaded_count = 0
    idx = 0
    
    while downloaded_count < n_target and idx < len(video_entries):
        video_url = video_entries[idx].get('url') or video_entries[idx].get('webpage_url')
        current_id = downloaded_count + 1
        
        # Options for this specific download
        ydl_opts = {
            'format': 'bestaudio/best',
            # Force the name to exactly song1, song2, etc.
            'outtmpl': f'song{current_id}.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }

        try:
            print(f"Attempting to download {current_id}/{n_target}...")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
            downloaded_count += 1
        except Exception as e:
            print(f"Skipping video due to error: {e}")
        
        idx += 1

    print(f"Finished! Downloaded {downloaded_count} songs.")

if __name__ == "__main__":
    # CONFIGURATION
    TARGET_URL = "https://www.youtube.com/@Chillpeach/videos"
    N = 9  # Your single-digit limit
    download_random_mp3s(TARGET_URL, N)