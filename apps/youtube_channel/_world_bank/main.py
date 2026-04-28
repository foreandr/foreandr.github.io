import os
import sys
import pandas as pd
import cv2
import time
import glob
import random
from concurrent.futures import ProcessPoolExecutor
from pydub import AudioSegment
from datetime import datetime

# --- LINK TO THE SHARED ENGINE ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import config, utils, renderer, ai, image_gen, apps.youtube_channel.upload1 as upload1,upload2, create_thumbnail

# --- DYNAMIC PROJECT SETTINGS ---
DATA_SOURCE = "World Bank https://api.worldbank.org/v2"
DATA_FILE = 'worldbank_data.csv'
HIGHEST_IS_BEST = True  
CURRENT_YEAR = datetime.now().year
FOLDER_NAME = os.path.basename(os.path.dirname(os.path.abspath(__file__))).upper()

def generate_audio(duration_ms):
    song_files = glob.glob(os.path.join(config.SONGS_DIR, "*.mp3"))
    if not song_files: return None
    combined = AudioSegment.from_file(song_files[0])
    while len(combined) < duration_ms + 5000:
        combined = combined.append(AudioSegment.from_file(random.choice(song_files)), crossfade=3000)
    path = "dynamic_soundtrack.mp3"
    combined[:duration_ms].fade_out(5000).export(path, format="mp3")
    return path

def run_pipeline(indicator_title, full_df):
    """
    Runs the full video generation and upload pipeline for a specific World Bank indicator.
    """
    print(f"\n{'='*60}")
    print(f"PROCESSING: {indicator_title}")
    print(f"{'='*60}")

    # 1. HISTORY CHECK
    if os.path.exists(config.LOG_FILE):
        try:
            h_df = pd.read_csv(config.LOG_FILE)
            if not h_df[(h_df['indicator'] == indicator_title) & 
                        (h_df['source'] == FOLDER_NAME) & 
                        (h_df['status'] == 'SUCCESS')].empty:
                print(f"--- {indicator_title} already uploaded. Skipping. ---")
                return
        except: pass

    # 2. DATA PREP FOR THIS INDICATOR
    df = full_df[full_df['indicator_label'].str.strip() == indicator_title].copy()
    
    if df.empty:
        print(f"No data found for {indicator_title}. Skipping.")
        return

    # --- DEDUPLICATION & CLEANING ---
    df = df.groupby(['country', 'year']).agg({
        'value': 'mean', 
        'indicator_label': 'first'
    }).reset_index()
    # -------------------------

    years = sorted(df['year'].unique())
    if len(years) < 2:
        print(f"Not enough years of data for {indicator_title}. Skipping.")
        return

    total_frames = int(config.TARGET_SECONDS * config.FPS)
    f_per_t = total_frames / (len(years) - 1)
    
    winning_stats = pd.concat([df[df['year'] == y].sort_values('value', ascending=not HIGHEST_IS_BEST).head(config.TOP_N) for y in years])
    x_min, x_max = 0, winning_stats['value'].max() * 1.1

    # 3. TASK BUILDING
    all_tasks, frame_count, surge_triggers, last_leader, active_s = [], 0, {}, None, None
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    check_interval = int(total_frames * 0.1)

    for i in range(len(years) - 1):
        y1, y2 = years[i], years[i+1]
        df1 = df[df['year'] == y1].set_index('country')['value']
        df2 = df[df['year'] == y2].set_index('country')['value']
        
        all_c = df1.index.union(df2.index)
        df1, df2 = df1.reindex(all_c, fill_value=0), df2.reindex(all_c, fill_value=0)
        r1, r2 = df1.rank(ascending=not HIGHEST_IS_BEST, method='first'), df2.rank(ascending=not HIGHEST_IS_BEST, method='first')
        
        for step in range(int(f_per_t)):
            a = step / f_per_t
            if frame_count % check_interval == 0:
                current_v = df1 + (df2 - df1) * a
                leader = current_v.idxmax() if HIGHEST_IS_BEST else current_v.idxmin()
                
                if leader != last_leader and last_leader is not None:
                    image_gen.generate_infographic(ai.ask_history(f"{y1}: {leader} lead in {indicator_title}"), f"infographic_{frame_count}.png")
                    surge_triggers[frame_count] = frame_count
                last_leader = leader
            
            if frame_count in surge_triggers: active_s = (surge_triggers[frame_count], frame_count)
            if active_s and (frame_count - active_s[1]) >= int(total_frames * (config.SURGE_DURATION_PCT/100)): active_s = None
            
            c_v, c_r = df1 + (df2 - df1) * a, r1 + (r2 - r1) * utils.fast_snap(a)
            mask = c_r <= (config.TOP_N + 2)
            all_tasks.append((frame_count, y1, months[min(int(a * 12), 11)], 
                             c_v[mask].index.tolist(), 
                             c_v[mask].tolist(), 
                             c_r[mask].tolist(), active_s))
            frame_count += 1

    # 4. RENDER
    print(f"Rendering {len(all_tasks)} frames for {indicator_title}...")
    v_writer = cv2.VideoWriter('temp_video.mp4', cv2.VideoWriter_fourcc(*'mp4v'), config.FPS, (1200, 700))
    
    with ProcessPoolExecutor(max_workers=max(1, int(os.cpu_count() * config.CPU_USAGE_CAP))) as ex:
        args = [(i, all_tasks[i:i+25], x_min, x_max, total_frames, indicator_title, DATA_SOURCE) for i in range(0, len(all_tasks), 25)]
        for batch in ex.map(renderer.render_batch, args):
            for _, img in batch: v_writer.write(img)
    v_writer.release()
    
    # 5. AUDIO & ASSEMBLY
    audio_path = generate_audio(config.TARGET_SECONDS * 1000)
    os.system(f"ffmpeg -y -i temp_video.mp4 -i {audio_path} -t {config.TARGET_SECONDS} -c:v copy -c:a aac -shortest final_video.mp4")

    # 6. THUMBNAIL & UPLOAD
    cap = cv2.VideoCapture("final_video.mp4")
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite("thumbnail.jpg", frame)
        create_thumbnail.generate_custom_thumbnail("thumbnail.jpg", "WORLD BANK", utils.smart_title(indicator_title), f"{min(years)}-{max(years)}", str(max(years)))
    cap.release()

    if not config.DRY_RUN:
        yt_t = f"WORLD BANK: {'Highest' if HIGHEST_IS_BEST else 'Lowest'} {utils.smart_title(indicator_title)} ({min(years)}-{max(years)})"
        try:
            vid_id = upload2.upload_to_youtube("final_video.mp4", "thumbnail.jpg", yt_t)
            status = "SUCCESS"
        except Exception as e:
            print(f"Upload failed: {e}"); status = "FAILED"; vid_id = "N/A"
        
        log_data = {
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"), 
            'source': FOLDER_NAME, 
            'indicator': indicator_title, 
            'title': yt_t, 
            'video_id': vid_id, 
            'status': status
        }
        pd.DataFrame([log_data]).to_csv(config.LOG_FILE, mode='a', header=not os.path.exists(config.LOG_FILE), index=False)

    # 7. CLEANUP
    cleanup_list = ["temp_video.mp4", "dynamic_soundtrack.mp3"] + glob.glob("infographic_*.png")
    if not config.KEEP_LOCAL_VIDEO: cleanup_list.append("final_video.mp4")
    if not config.KEEP_LOCAL_THUMBNAIL: cleanup_list.append("thumbnail.jpg")

    for f in cleanup_list:
        if os.path.exists(f):
            try: os.remove(f)
            except: pass

def main():
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return

    full_df = pd.read_csv(DATA_FILE, encoding='utf-8-sig')
    full_df = full_df[full_df['year'] <= CURRENT_YEAR].copy()

    all_indicators = full_df['indicator_label'].unique()
    print(f"Found {len(all_indicators)} indicators in {DATA_FILE}")

    for indicator in all_indicators:
        start = time.time()
        run_pipeline(indicator, full_df)
        print(f"FINISHED: {indicator} in {round(time.time()-start, 2)}s")

if __name__ == "__main__":
    main()