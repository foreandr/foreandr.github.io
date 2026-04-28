import os
import glob
import random
from pydub import AudioSegment
import config
import progress_tracker

def generate_audio(duration_ms):
    """
    Generates a dynamic soundtrack by combining random songs from the songs folder.
    Crossfades between tracks and fades out at the end.
    
    Args:
        duration_ms: Target duration in milliseconds
        
    Returns:
        str: Path to the generated audio file, or None if no songs found
    """
    song_files = glob.glob(os.path.join(config.SONGS_DIR, "*.mp3"))
    
    if not song_files:
        print("Warning: No songs found in songs directory")
        return None
    
    tracker = progress_tracker.ProgressTracker(1, "Audio Generation")
    tracker.start_step(f"Mixing soundtrack ({duration_ms/1000:.1f}s)")
    
    # Start with first song
    combined = AudioSegment.from_file(song_files[0])
    songs_added = 1
    
    # Keep adding random songs until we have enough duration
    while len(combined) < duration_ms + 5000:  # +5s buffer for fade out
        combined = combined.append(
            AudioSegment.from_file(random.choice(song_files)), 
            crossfade=3000
        )
        songs_added += 1
    
    # Export final audio with fade out
    output_path = "dynamic_soundtrack.mp3"
    combined[:duration_ms].fade_out(5000).export(output_path, format="mp3")
    
    tracker.complete_step()
    print(f"✓ Mixed {songs_added} songs into {duration_ms/1000:.1f}s soundtrack")
    
    return output_path