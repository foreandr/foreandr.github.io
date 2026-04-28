import os
import cv2
import glob
import time
from concurrent.futures import ProcessPoolExecutor
import config
import renderer
import audio_manager
import create_thumbnail
import upload1
import upload2
import history_manager
import utils
import progress_tracker

def render_video(all_tasks, x_min, x_max, indicator_title, data_source, unit_label):
    """
    Renders all animation frames to a video file.
    """
    tracker = progress_tracker.ProgressTracker(1, "Video Rendering")
    tracker.start_step(f"Rendering {len(all_tasks)} frames")
    
    total_frames = len(all_tasks)
    # Define the video writer (1200x700 matches the renderer's figsize)
    v_writer = cv2.VideoWriter('temp_video.mp4', cv2.VideoWriter_fourcc(*'mp4v'), config.FPS, (1200, 700))
    
    # Parallel rendering
    batch_size = 25
    
    with ProcessPoolExecutor(max_workers=max(1, int(os.cpu_count() * config.CPU_USAGE_CAP))) as ex:
        batch_args = [
            (i, all_tasks[i:i+batch_size], x_min, x_max, total_frames, indicator_title, data_source, unit_label) 
            for i in range(0, len(all_tasks), batch_size)
        ]
        
        # ex.map preserves the order of the batches
        for batch in ex.map(renderer.render_batch, batch_args):
            # IMPORTANT: renderer.render_batch returns a list of (index, image) tuples.
            # We must unpack them and only pass the 'img' to the video writer.
            for idx, img in batch:
                v_writer.write(img)
            
    v_writer.release()
    tracker.complete_step()
    return 'temp_video.mp4'

def add_audio(video_path, target_seconds):
    """Adds a dynamic soundtrack using ffmpeg."""
    audio_path = audio_manager.generate_audio(target_seconds * 1000)
    output_path = "final_video.mp4"
    
    # Simple ffmpeg command to merge audio and video
    os.system(f"ffmpeg -y -i {video_path} -i {audio_path} -t {target_seconds} -c:v copy -c:a aac -shortest {output_path} -loglevel error")
    return output_path

def create_and_set_thumbnail(video_path, indicator_title, year_range):
    """Generates a custom thumbnail from the last frame of the video."""
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        cv2.imwrite("thumbnail.jpg", frame)
        create_thumbnail.generate_custom_thumbnail(
            "thumbnail.jpg", 
            "TOP GLOBAL", 
            utils.smart_title(indicator_title), 
            f"{year_range[0]}-{year_range[1]}", 
            year_range[1]
        )
    return "thumbnail.jpg"

def upload_and_log(video_path, thumbnail_path, folder_name, indicator_title, highest_is_best, year_range):
    """Handles the upload process with failover between UPLOAD 1 and UPLOAD 2."""
    tracker = progress_tracker.ProgressTracker(1, "YouTube Upload")
    tracker.start_step("Preparing upload metadata")
    
    mode_prefix = "Top" if highest_is_best else "Lowest"
    clean_indicator = indicator_title.replace('\n', ' ').strip().title()
    
    # Constructing the title and description
    yt_title = f"{folder_name}: {mode_prefix} {config.TOP_N} Countries by {clean_indicator} ({year_range[0]}-{year_range[1]})"
    description = f"Data visualized by the Engine."
    
    vid_id = None
    status = "FAILED"
    use_secondary = False

    # Try twice: once with primary uploader, once with secondary failover
    for attempt in range(2):
        mod = upload2 if use_secondary else upload1
        mod_name = "UPLOAD 2" if use_secondary else "UPLOAD 1"
        
        print(f"Attempting upload via {mod_name}...")
        try:
            # FIXED: Passing 4 arguments (video, title, description, thumbnail)
            # Both upload1.py and upload2.py functions must be updated to accept these 4
            result = mod.upload_to_youtube(video_path, yt_title, description, thumbnail_path)
            
            if result:
                vid_id = result if isinstance(result, str) else "SUCCESS_ID"
                status = "SUCCESS"
                print(f"✓ {mod_name} Success!")
                break
            else:
                print(f"✗ {mod_name} returned False. Switching...")
                use_secondary = not use_secondary
        except Exception as e:
            print(f"✗ {mod_name} error: {e}")
            use_secondary = not use_secondary
            time.sleep(2)

    tracker.complete_step()
    
    # Log to history.csv
    history_manager.log_upload_result(folder_name, indicator_title, yt_title, vid_id, status)

def cleanup_temp_files():
    """Removes temporary files after processing."""
    cleanup_list = ["temp_video.mp4", "dynamic_soundtrack.mp3"] + glob.glob("infographic_*.png")
    
    if not config.KEEP_LOCAL_VIDEO:
        cleanup_list.append("final_video.mp4")
    if not config.KEEP_LOCAL_THUMBNAIL:
        cleanup_list.append("thumbnail.jpg")

    for f in cleanup_list:
        if os.path.exists(f):
            try:
                os.remove(f)
            except:
                pass