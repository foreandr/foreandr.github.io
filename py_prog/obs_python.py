import time
from datetime import datetime
import threading
import os 
from obsws_python import ReqClient
from obsws_python.error import OBSSDKRequestError

# IMPORT the necessary functions from your uploader file
# NOTE: The file deletion logic must be added inside the process_and_upload_latest_file function
from google_video_upload import get_authenticated_service, process_and_upload_latest_file 

# --- Configuration ---
OBS_HOST = "localhost"
OBS_PORT = 4455
OBS_PASSWORD = "3zqvBCtapxZz4xwK"

# --- Cycle Durations ---
# Recording segment length: 5 hours (18000 seconds)
RECORD_SEGMENT_SECONDS = 18000
# Delay after stopping a recording to ensure the file is closed and released.
RECORD_STOP_DELAY = 5.0

# Stream health check interval set to 30 minutes (1800 seconds), independent of the recording cycle
STREAM_CHECK_INTERVAL_SECONDS = 1800 

# --- Global State ---
STOP_THREADS_FLAG = False
client = None
monitor_thread = None
youtube_service = None # Global variable for the authenticated YouTube service

# --- Stream Info Update Function ---
def update_stream_info(client: ReqClient, title: str):
    """Updates the stream title/game via the streaming service."""
    current_time = datetime.now().strftime('%H:%M:%S')
    current_title = f"{title} | Started at {current_time}"
    print(f"🔄 Setting stream title: '{current_title}'")
    try:
        current_settings = client.get_stream_service_settings()
        stream_service_type = current_settings.streamServiceType
        
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

# --- Background Stream Health Monitor Thread ---
def stream_health_monitor(client: ReqClient, check_interval: int):
    """
    Runs in a separate thread to periodically check stream health and restart if needed.
    The check interval is now a fixed time (e.g., 30 minutes).
    """
    global STOP_THREADS_FLAG
    print(f"\n[Monitor Thread] Started. Checking stream status every {check_interval} seconds.")
    
    # Wait half the interval before the first check
    time.sleep(check_interval / 2) 

    while not STOP_THREADS_FLAG:
        try:
            print(f"\n🩺 [Monitor Thread] STREAM HEALTH CHECK...")
            
            # 1. Get current stream status
            status = client.get_stream_status()
            
            if not status.output_active:
                print("🚨 [Monitor Thread] Stream is DOWN! Attempting to restart stream...")
                
                # 2. Update and Restart
                update_stream_info(client, "Indefinite Stream - RESTARTING")
                client.start_stream()
                print("✅ [Monitor Thread] Stream restart command sent. Waiting for stream to stabilize.")
                time.sleep(10) # Wait for the stream to establish connection

            else:
                print("💚 [Monitor Thread] Stream is UP and running.")
                
        except Exception as e:
            print(f"❌ [Monitor Thread] Health Check Error: {e}. Retrying after {check_interval}s.")

        # Sleep for the full interval, checking the stop flag every second
        for _ in range(check_interval):
            if STOP_THREADS_FLAG:
                break
            time.sleep(1)
            
    print("[Monitor Thread] Stopped gracefully.")

# --- Main Logic Function ---
def main():
    global client, monitor_thread, STOP_THREADS_FLAG, youtube_service
    
    # Connect to OBS
    try:
        client = ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD, timeout=5)
        print("✅ Successfully connected to OBS.")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        print("FATAL: Ensure OBS is running and WebSocket settings are correct.")
        return

    # --- YouTube Authentication ---
    print("\n--- Starting YouTube Authentication ---")
    youtube_service = get_authenticated_service()
    if not youtube_service:
        print("⚠️ YouTube Authentication failed. Proceeding with recording only (no upload).")
    else:
        print("✅ YouTube Authentication successful!")


    # --- Initial Failsafe: Ensure everything is OFF ---
    print("\n--- Failsafe Check: Ensuring all outputs are OFF ---")
    try:
        stream_status = client.get_stream_status()
        if stream_status.output_active:
            print("⚠️ Stream is ON. Stopping stream.")
            client.stop_stream()
            time.sleep(1)
        
        record_status = client.get_record_status()
        if record_status.output_active:
            print("⚠️ Recording is ON. Stopping recording.")
            client.stop_record()
            time.sleep(1)
            
        print("✅ Initial state is clean.")

    except Exception as e:
        print(f"❌ Failsafe Check Error: {e}")
        print("FATAL: Could not verify/stop output status. Exiting.")
        return

    # --- Initial Stream Start (ROBUST) ---
    print("\n--- Starting Continuous Stream ---")
    try:
        update_stream_info(client, "Indefinite Stream with Segmented Recording")
        
        status_check = client.get_stream_status()
        if not status_check.output_active:
            client.start_stream()
            print("✅ Stream started. Entering continuous loop.")
        else:
            print("⚠️ Stream was reported active immediately after failsafe. Proceeding to loop.")

    except OBSSDKRequestError as e:
        print(f"❌ FATAL Error starting stream: {e}")
        print("ACTION REQUIRED: Check your OBS Stream Settings (Stream Key, Service, Encoder) for a Code 500 error.")
        return
    except Exception as e:
        print(f"❌ FATAL Error: {e}")
        return

    # ---------------------------------------------------------------------
    ## Main Loop (Recording)
    # ---------------------------------------------------------------------

    # --- Start Background Thread for Stream Monitoring ---
    monitor_thread = threading.Thread(
        target=stream_health_monitor,
        args=(client, STREAM_CHECK_INTERVAL_SECONDS),
        daemon=True
    )
    monitor_thread.start()

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
            
            # 1. Start Recording Segment
            record_stopped_successfully = False
            
            try:
                record_status_check = client.get_record_status()
                if not record_status_check.output_active:
                    print(f"▶️ Starting Recording Segment (Duration: {RECORD_SEGMENT_SECONDS}s)")
                    client.start_record()
                else:
                    print("⚠️ Recording already active. Skipping StartRecord command.")

            except OBSSDKRequestError as e:
                if "recording already active" in str(e):
                    print("⚠️ Start Record failed: Recording already active. Skipping.")
                else:
                    print(f"❌ Recording start error ({e}). Attempting recovery by stopping...")
                    client.stop_record()
                    time.sleep(RECORD_STOP_DELAY)
            

            # 2. Wait for the segment duration (5 hours)
            print(f"😴 Waiting for {RECORD_SEGMENT_SECONDS} seconds...")
            time.sleep(RECORD_SEGMENT_SECONDS)

            # 3. Stop Recording Segment
            try:
                record_status_check = client.get_record_status()
                if record_status_check.output_active:
                    print(f"⏹️ Stopping Recording Segment. (File saved)")
                    client.stop_record()
                    record_stopped_successfully = True # Mark as successful
                    
                    print(f"⏳ Waiting for {RECORD_STOP_DELAY} seconds for file finalization...")
                    time.sleep(RECORD_STOP_DELAY)
                else:
                    print("⚠️ Recording was inactive. Skipping StopRecord command.")
                    time.sleep(RECORD_STOP_DELAY)

            except OBSSDKRequestError as e:
                if "recording not active" in str(e):
                    print("⚠️ Stop Record failed: Recording was already inactive.")
                else:
                    raise e
            
            # 4. START UPLOAD IN A NEW THREAD
            if record_stopped_successfully and youtube_service:
                print("📤 Starting YouTube upload process in a background thread...")
                # The process_and_upload_latest_file function MUST be updated
                # to include logic to delete the file upon successful upload.
                upload_thread = threading.Thread(
                    target=process_and_upload_latest_file, 
                    args=(youtube_service,),
                    daemon=True # Ensures thread stops when main script exits
                )
                upload_thread.start()
            elif record_stopped_successfully and not youtube_service:
                 print("Upload skipped: YouTube service is not authenticated.")
            
    # ---------------------------------------------------------------------
    ## Exit Cleanup
    # ---------------------------------------------------------------------

    # --- Clean Exit Procedure ---
    except KeyboardInterrupt:
        print("\n\nProgram interrupted by user (Ctrl+C). Initiating clean shutdown...")

    # Ensure stream and recording are stopped when the script is manually stopped
    finally:
        STOP_THREADS_FLAG = True # Signal the background thread to stop

        print("\n--- Final Cleanup ---")
        try:
            # Stop Recording first
            record_status = client.get_record_status()
            if record_status.output_active:
                print("Final step: Stopping active recording.")
                client.stop_record()
                try:
                    time.sleep(RECORD_STOP_DELAY)
                except KeyboardInterrupt:
                    pass
            
            # Stop Stream last
            stream_status = client.get_stream_status()
            if stream_status.output_active:
                print("Final step: Stopping the continuous stream.")
                client.stop_stream()
                
            print("Exiting cleanly.")
            
        except Exception as e:
            print(f"Finished. (Cleanup error ignored: {e})")

if __name__ == '__main__':
    main()