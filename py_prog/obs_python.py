import time
from datetime import datetime
import threading
import os
import subprocess
from obsws_python import ReqClient
from obsws_python.error import OBSSDKRequestError
import update_js_file

# IMPORT the necessary functions from your uploader file
from google_video_upload import get_authenticated_service, process_and_upload_latest_file

# --- Configuration ---
OBS_HOST = "localhost"
OBS_PORT = 4455
OBS_PASSWORD = "3zqvBCtapxZz4xwK"

# --- Cycle Durations ---
RECORD_SEGMENT_SECONDS = 18000  # 5 hours
RECORD_STOP_DELAY = 5.0
STREAM_CHECK_INTERVAL_SECONDS = 1800  # 30 minutes

# --- Global State ---
STOP_THREADS_FLAG = False
client = None
monitor_thread = None
youtube_service = None  # authenticated YT service


# ---------------------------------------------------------------------------
# git_function: run .bat + show output
# ---------------------------------------------------------------------------
def git_function():
    update_js_file.update_live_url()
    """
    Runs the local upload_github.bat and prints everything.
    We feed a commit message so the .bat does NOT block.
    """
    print("🟣 [git_function] Starting git push hook...")
    script_dir = os.path.dirname(os.path.abspath(__file__))

    candidates = [
        os.path.join(script_dir, "upload_github.bat"),
        os.path.join(script_dir, "..", "upload_github.bat"),
    ]

    bat_path = None
    for c in candidates:
        if os.path.isfile(c):
            bat_path = c
            break

    print(f"🟣 [git_function] CWD:        {os.getcwd()}")
    print(f"🟣 [git_function] script dir: {script_dir}")
    print(f"🟣 [git_function] candidates: {candidates}")

    if bat_path is None:
        print("🔴 [git_function] upload_github.bat NOT FOUND. Skipping.")
        return

    print(f"🟣 [git_function] Using batch file: {bat_path}")

    default_msg = "auto-commit from OBS monitor"

    try:
        completed = subprocess.run(
            ["cmd.exe", "/c", bat_path],
            input=(default_msg + "\n"),
            text=True,
            cwd=script_dir,     # so git runs in your repo
            capture_output=True # so we can print it
        )
        print("🟣 [git_function] --- .BAT STDOUT ---")
        print(completed.stdout if completed.stdout else "(no stdout)")
        print("🟣 [git_function] --- .BAT STDERR ---")
        print(completed.stderr if completed.stderr else "(no stderr)")
        print(f"🟣 [git_function] Return code: {completed.returncode}")

        if completed.returncode == 0:
            print("✅ [git_function] upload_github.bat finished OK.")
        else:
            print("🔴 [git_function] upload_github.bat FAILED. See above.")
    except Exception as e:
        print(f"🔴 [git_function] Error running upload_github.bat: {e}")


# ---------------------------------------------------------------------------
# Stream info update (defensive)
# ---------------------------------------------------------------------------
def update_stream_info(client: ReqClient, title: str):
    current_time = datetime.now().strftime('%H:%M:%S')
    current_title = f"{title} | Started at {current_time}"
    print(f"🔄 Setting stream title: '{current_title}'")
    try:
        settings = client.get_stream_service_settings()
        stream_service_type = None
        if hasattr(settings, "streamServiceType"):
            stream_service_type = settings.streamServiceType
        elif hasattr(settings, "stream_service_type"):
            stream_service_type = settings.stream_service_type

        if not stream_service_type:
            print("⚠️ Could not determine stream service type from OBS response. Skipping title update.")
            return

        client.set_stream_service_settings(
            stream_service_type,
            ss_settings={
                "StreamTitle": current_title,
                "Game": "Just Chatting"
            }
        )
        print("✅ Stream title updated.")
    except Exception as e:
        print(f"❌ Failed to update stream title/info. Error: {e}")


# ---------------------------------------------------------------------------
# Health monitor
# ---------------------------------------------------------------------------
def stream_health_monitor(client: ReqClient, check_interval: int):
    """
    Runs forever, checks stream, and after EVERY check runs git_function().
    """
    global STOP_THREADS_FLAG
    print(f"\n[Monitor Thread] Started. Checking stream status every {check_interval} seconds.")

    # FIRST instant check:
    _do_single_health_check_and_git(client)

    # THEN loop:
    while not STOP_THREADS_FLAG:
        for _ in range(check_interval):
            if STOP_THREADS_FLAG:
                break
            time.sleep(1)
        if STOP_THREADS_FLAG:
            break
        _do_single_health_check_and_git(client)

    print("[Monitor Thread] Stopped gracefully.")


def _do_single_health_check_and_git(client: ReqClient):
    print("\n🩺 [Monitor Thread] STREAM HEALTH CHECK...")
    try:
        status = client.get_stream_status()
        if not status.output_active:
            print("🚨 [Monitor Thread] Stream is DOWN! Restarting...")
            update_stream_info(client, "Indefinite Stream - RESTARTING")
            client.start_stream()
            print("✅ [Monitor Thread] Restart sent.")
            time.sleep(10)
        else:
            print("💚 [Monitor Thread] Stream is UP.")
    except Exception as e:
        print(f"❌ [Monitor Thread] Health Check Error: {e}")

    # NOW run git every time:
    git_function()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    global client, monitor_thread, STOP_THREADS_FLAG, youtube_service

    # 1) connect to OBS
    try:
        client = ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD, timeout=5)
        print("✅ Successfully connected to OBS.")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2) YouTube auth
    print("\n--- Starting YouTube Authentication ---")
    youtube_service = get_authenticated_service()
    if not youtube_service:
        print("⚠️ YouTube Authentication failed. Proceeding without upload.")
    else:
        print("✅ YouTube Authentication successful!")

    # 3) Failsafe
    print("\n--- Failsafe Check: Ensuring all outputs are OFF ---")
    try:
        s = client.get_stream_status()
        if s.output_active:
            print("⚠️ Stream ON → stopping.")
            client.stop_stream()
            time.sleep(1)
        r = client.get_record_status()
        if r.output_active:
            print("⚠️ Recording ON → stopping.")
            client.stop_record()
            time.sleep(1)
        print("✅ Initial state is clean.")
    except Exception as e:
        print(f"❌ Failsafe error: {e}")
        return

    # 4) Start stream
    print("\n--- Starting Continuous Stream ---")
    try:
        update_stream_info(client, "Indefinite Stream with Segmented Recording")

        status_check = client.get_stream_status()
        if not status_check.output_active:
            client.start_stream()
            print("✅ Stream started. Entering continuous loop.")
        else:
            print("⚠️ Stream reported active, continuing.")
    except Exception as e:
        print(f"❌ FATAL Error starting stream: {e}")
        return

    # 4.5) 🔥 RUN GIT IMMEDIATELY ON LOAD (this is what you asked for)
    print("\n--- Running initial git push (on startup) ---")
    git_function()

    # 5) start monitor thread
    monitor_thread = threading.Thread(
        target=stream_health_monitor,
        args=(client, STREAM_CHECK_INTERVAL_SECONDS),
        daemon=True,
    )
    monitor_thread.start()

    # 6) main recording loop
    print("\n=======================================================")
    print(f"Starting segmented recording cycle ({RECORD_SEGMENT_SECONDS}s segments, or 5 hours).")
    print(f"Stream health is now monitored every {STREAM_CHECK_INTERVAL_SECONDS}s.")
    print("Press Ctrl+C to stop the program at any time.")
    print("=======================================================\n")

    cycle_count = 0
    try:
        while True:
            cycle_count += 1
            print(f"\n--- Recording Cycle #{cycle_count} ---")

            record_stopped_successfully = False

            # start recording
            try:
                rs = client.get_record_status()
                if not rs.output_active:
                    print(f"▶️ Starting Recording Segment (Duration: {RECORD_SEGMENT_SECONDS}s)")
                    client.start_record()
                else:
                    print("⚠️ Recording already active. Skipping.")
            except OBSSDKRequestError as e:
                if "recording already active" in str(e):
                    print("⚠️ Start Record failed: already active.")
                else:
                    print(f"❌ Recording start error: {e}")
                    client.stop_record()
                    time.sleep(RECORD_STOP_DELAY)

            # wait for full segment
            print(f"😴 Waiting for {RECORD_SEGMENT_SECONDS} seconds...")
            time.sleep(RECORD_SEGMENT_SECONDS)

            # stop recording
            try:
                rs = client.get_record_status()
                if rs.output_active:
                    print("⏹️ Stopping Recording Segment.")
                    client.stop_record()
                    record_stopped_successfully = True
                    print(f"⏳ Waiting {RECORD_STOP_DELAY}s for finalization...")
                    time.sleep(RECORD_STOP_DELAY)
                else:
                    print("⚠️ Recording inactive, nothing to stop.")
                    time.sleep(RECORD_STOP_DELAY)
            except OBSSDKRequestError as e:
                if "recording not active" in str(e):
                    print("⚠️ Stop Record failed: already inactive.")
                else:
                    raise e

            # upload (background)
            if record_stopped_successfully and youtube_service:
                print("📤 Starting YouTube upload in background...")
                upload_thread = threading.Thread(
                    target=process_and_upload_latest_file,
                    args=(youtube_service,),
                    daemon=True,
                )
                upload_thread.start()
            elif record_stopped_successfully and not youtube_service:
                print("Upload skipped: YouTube not authenticated.")

    except KeyboardInterrupt:
        print("\n\nProgram interrupted by user (Ctrl+C). Initiating clean shutdown...")

    finally:
        STOP_THREADS_FLAG = True
        print("\n--- Final Cleanup ---")
        try:
            rs = client.get_record_status()
            if rs.output_active:
                print("Stopping active recording...")
                client.stop_record()
                try:
                    time.sleep(RECORD_STOP_DELAY)
                except KeyboardInterrupt:
                    pass

            ss = client.get_stream_status()
            if ss.output_active:
                print("Stopping active stream...")
                client.stop_stream()

            print("Exiting cleanly.")
        except Exception as e:
            print(f"Finished. (Cleanup error ignored: {e})")


if __name__ == "__main__":
    main()
