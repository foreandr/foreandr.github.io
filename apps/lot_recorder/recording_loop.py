import time
from obsws_python import ReqClient

# HyperSel-based uploader
from hyper_upload import get_newest_video_file, upload_video_file, delete_file

# Import your configuration
from data import (
    OBS_HOST, OBS_PORT, OBS_PASSWORD, OBS_TIMEOUT,
    RECORD_SEGMENT_SECONDS, RECORD_STOP_DELAY,
    VIDEO_DIR
)

STOP_THREADS_FLAG = False

def connect_obs():
    try:
        c = ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD, timeout=OBS_TIMEOUT)
        print("Connected to OBS.")
        return c
    except Exception as e:
        print(f"OBS Connection Error: {e}")
        return None

# =======================================================
# THE RECORDING LOOP
# =======================================================
def run_recording_cycle(c: ReqClient):
    global STOP_THREADS_FLAG
    print(f"Recording Loop Started ({RECORD_SEGMENT_SECONDS}s segments)")

    while not STOP_THREADS_FLAG:
        try:
            rs = c.get_record_status()
            if not rs.output_active:
                c.start_record()
                print(f"Recording segment started at {time.strftime('%H:%M:%S')}")

            # Record for the configured duration
            time.sleep(RECORD_SEGMENT_SECONDS)

            print("Segment complete. Stopping record...")
            c.stop_record()

            # Wait for OBS to finalize the file
            time.sleep(RECORD_STOP_DELAY)

            # Upload exactly the file just recorded, then delete it
            latest_file = get_newest_video_file(VIDEO_DIR)
            if not latest_file:
                print("No video file found after recording. Skipping upload.")
                continue

            upload_success = upload_video_file(latest_file)
            if upload_success:
                delete_file(latest_file)

        except Exception as e:
            print(f"Recorder Error: {e}")
            time.sleep(10)

def main():
    global STOP_THREADS_FLAG

    obs_client = connect_obs()
    if not obs_client:
        return

    # Start the recording loop in the main thread
    try:
        run_recording_cycle(obs_client)
    except KeyboardInterrupt:
        print("Shutting down...")
        STOP_THREADS_FLAG = True
        try:
            obs_client.stop_record()
        except Exception:
            pass

if __name__ == "__main__":
    main()
