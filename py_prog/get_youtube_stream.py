import webview
import subprocess
import time
import os
import sys
from datetime import datetime
from multiprocessing import Process
import signal
import pygetwindow as gw
import data

# === Config ===
OUTPUT_DIR = "videos"
CHUNK_SECONDS = 30   # record length per segment
MAX_FILES = 15        # keep last 5 files
WINDOW_TITLE = "Live Stream Viewer"

# === Graceful Ctrl+C handler ===
def signal_handler(sig, frame):
    print("\n[Main] Ctrl+C received. Shutting down...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def ensure_output_dir():
    """Create or clean the output directory before each run."""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"[Setup] Created folder: {OUTPUT_DIR}")
    else:
        # Clear all old videos
        for f in os.listdir(OUTPUT_DIR):
            path = os.path.join(OUTPUT_DIR, f)
            try:
                os.remove(path)
                print(f"[Setup] Deleted old file from previous run: {path}")
            except Exception as e:
                print(f"[Setup] Failed to delete {path}: {e}")

def wait_for_window(title, timeout=30):
    """Wait until the target window exists and has nonzero size"""
    print(f"[Wait] Looking for window: {title}")
    for _ in range(timeout):
        try:
            win = gw.getWindowsWithTitle(title)[0]
            if win.width > 0 and win.height > 0:
                print(f"[Wait] Window ready at ({win.left}, {win.top}) size {win.width}x{win.height}")
                return win
        except IndexError:
            pass
        time.sleep(1)
    raise RuntimeError(f"Window {title} not found or invalid after {timeout}s")

def record_loop():
    """Record loop in the main thread so Ctrl+C works, with retries"""
    ensure_output_dir()
    win = wait_for_window(WINDOW_TITLE)

    while True:
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = os.path.join(OUTPUT_DIR, f"video_{timestamp}.mp4")

        print(f"[Recorder] Attempting {CHUNK_SECONDS}s capture -> {filename}")

        try:
            subprocess.run([
                "ffmpeg", "-y",
                "-f", "gdigrab",                # Windows screen capture
                "-framerate", "20",
                "-offset_x", str(win.left),
                "-offset_y", str(win.top),
                "-video_size", f"{win.width}x{win.height}",
                "-t", str(CHUNK_SECONDS),
                "-i", "desktop",
                "-vf", "format=yuv420p",        # ✅ explicit conversion
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",          # ✅ enforce standard format
                "-profile:v", "high",           # ✅ force High profile, not 4:4:4
                "-g", "40",                     # ✅ keyframe every ~2s at 20fps
                "-tune", "zerolatency",         # ✅ helps with live capture
                filename
            ], check=True)

            # Check if file looks valid
            if not os.path.exists(filename) or os.path.getsize(filename) < 1024 * 10:
                print(f"[Recorder] File {filename} invalid (too small). Retrying in 5s...")
                if os.path.exists(filename):
                    os.remove(filename)
                time.sleep(5)
                continue

            print(f"[Recorder] Success -> {filename}")
            rotate_files()

        except subprocess.CalledProcessError as e:
            print(f"[Recorder] FFmpeg error: {e}. Retrying in 5s...")
            time.sleep(5)
            continue

def rotate_files():
    """Delete older files, keep only the latest MAX_FILES"""
    files = sorted(
        [os.path.join(OUTPUT_DIR, f) for f in os.listdir(OUTPUT_DIR)],
        key=os.path.getmtime
    )
    if len(files) > MAX_FILES:
        to_delete = files[:len(files) - MAX_FILES]
        for f in to_delete:
            try:
                os.remove(f)
                print(f"[Cleaner] Deleted old file: {f}")
            except Exception as e:
                print(f"[Cleaner] Failed to delete {f}: {e}")

def start_stream():
    """Launch the PyWebView player window (blocking)"""
    stream_url = data.youtube_live_link
    for attempt in range(3):
        try:
            print(f"[Stream] Launching PyWebView (attempt {attempt+1})...")
            webview.create_window(WINDOW_TITLE, stream_url, width=800, height=600, resizable=False)
            webview.start()
            print("[Stream] PyWebView closed.")
            break
        except Exception as e:
            print(f"[Stream] Failed to load: {e}")
            time.sleep(5)
    else:
        print("[Stream] Could not launch stream after 3 attempts. Exiting.")
        sys.exit(1)

if __name__ == "__main__":
    # Start PyWebView in a subprocess so ffmpeg can grab it by title
    p = Process(target=start_stream)
    p.start()

    print("[Main] Waiting for window to appear...")
    time.sleep(3)  # give it a head start

    try:
        record_loop()  # runs until Ctrl+C
    finally:
        print("[Main] Terminating stream window...")
        p.terminate()
        p.join()
