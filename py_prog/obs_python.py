import time
from datetime import datetime
from obsws_python import ReqClient
from obsws_python.error import OBSSDKRequestError

# --- Configuration ---
# IMPORTANT: Update these values to match your OBS Studio settings.
OBS_HOST = "localhost"
OBS_PORT = 4455
OBS_PASSWORD = "3zqvBCtapxZz4xwK"

# --- Cycle Durations ---
# Recording segment length: 15 seconds
RECORD_SEGMENT_SECONDS = 15  
# Delay after stopping a recording to ensure the file is closed and released.
RECORD_STOP_DELAY = 5.0 
# How often to check the stream status (e.g., check every 10 recording cycles)
STREAM_CHECK_CYCLES = 10
STREAM_CHECK_INTERVAL_SECONDS = RECORD_SEGMENT_SECONDS * STREAM_CHECK_CYCLES

# --- OBS Clients ---
client = None

# --- Stream Info Update Function (FINAL FIX for positional arguments) ---
def update_stream_info(client: ReqClient, title: str):
    """Updates the stream title/game via the streaming service."""
    current_time = datetime.now().strftime('%H:%M:%S')
    current_title = f"{title} | Started at {current_time}"
    print(f"🔄 Setting stream title: '{current_title}'")
    try:
        # FIX: The set_stream_service_settings function in your library requires 
        # the stream service type as the first positional argument. We retrieve the 
        # current type to satisfy the function call.
        current_settings = client.get_stream_service_settings()
        stream_service_type = current_settings.streamServiceType # Get the active service type
        
        client.set_stream_service_settings(
            stream_service_type, # 1. Positional arg 1 (ss_type)
            ss_settings={        # 2. Keyword arg (ss_settings)
                "StreamTitle": current_title,
                "Game": "Just Chatting" 
            }
        )
        print("✅ Stream title updated.")
    except Exception as e:
        print(f"❌ Failed to update stream title/info. Error: {e}")

# Connect to OBS
try:
    client = ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD, timeout=5)
    print("✅ Successfully connected to OBS.")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    print("FATAL: Ensure OBS is running and WebSocket settings are correct.")
    exit()

# --- Initial Failsafe: Ensure everything is OFF ---
print("\n--- Failsafe Check: Ensuring all outputs are OFF ---")
try:
    # Check and Stop Stream
    stream_status = client.get_stream_status()
    if stream_status.output_active:
        print("⚠️ Stream is ON. Stopping stream.")
        client.stop_stream()
        time.sleep(1)
    
    # Check and Stop Recording
    record_status = client.get_record_status()
    if record_status.output_active:
        print("⚠️ Recording is ON. Stopping recording.")
        client.stop_record()
        time.sleep(1)
        
    print("✅ Initial state is clean.")

except Exception as e:
    print(f"❌ Failsafe Check Error: {e}")
    print("FATAL: Could not verify/stop output status. Exiting.")
    exit()

# --- Initial Stream Start (ROBUST) ---
print("\n--- Starting Continuous Stream ---")
try:
    update_stream_info(client, "Indefinite Stream with Segmented Recording")
    
    # ROBUST CHECK: Only start if stream is currently reported as inactive
    status_check = client.get_stream_status()
    if not status_check.output_active:
        client.start_stream()
        print("✅ Stream started. Entering continuous loop.")
    else:
        print("⚠️ Stream was reported active immediately after failsafe. Proceeding to loop.")

except OBSSDKRequestError as e:
    print(f"❌ FATAL Error starting stream: {e}")
    print("ACTION REQUIRED: Check your OBS Stream Settings (Stream Key, Service, Encoder) for a Code 500 error.")
    exit()
except Exception as e:
    print(f"❌ FATAL Error: {e}")
    exit()


# --- Main Infinite Loop for Recording and Health Check (ROBUST) ---
print("\n=======================================================")
print(f"Starting segmented recording cycle ({RECORD_SEGMENT_SECONDS}s segments).")
print(f"Stream health will be checked every {STREAM_CHECK_INTERVAL_SECONDS} seconds.")
print("Press Ctrl+C to stop the program at any time.")
print("=======================================================\n")

cycle_count = 0
try:
    while True:
        cycle_count += 1
        print(f"\n--- Cycle #{cycle_count} ---")
        
        # 1. Start Recording Segment
        try:
            # ROBUST CHECK: Only start if recording is currently reported as inactive
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
        

        # 2. Wait for the segment duration
        time.sleep(RECORD_SEGMENT_SECONDS)

        # 3. Stop Recording Segment
        try:
            # ROBUST CHECK: Only stop if recording is currently reported as active
            record_status_check = client.get_record_status()
            if record_status_check.output_active:
                print(f"⏹️ Stopping Recording Segment. (File saved)")
                client.stop_record()
                # Wait 5 seconds to ensure the file is closed and saved by OBS
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
        
        # 4. Stream Health Check (Run every N cycles)
        if cycle_count % STREAM_CHECK_CYCLES == 0:
            print(f"\n🩺 STREAM HEALTH CHECK (Every {STREAM_CHECK_CYCLES} cycles)...")
            try:
                status = client.get_stream_status()
                if not status.output_active:
                    print("🚨 Stream is DOWN! Attempting to restart stream...")
                    update_stream_info(client, "Indefinite Stream - RESTARTING")
                    client.start_stream()
                    print("✅ Stream restart command sent.")
                else:
                    print("💚 Stream is UP and running.")
            except Exception as e:
                print(f"❌ Health Check Error: {e}")


# --- Clean Exit Procedure ---
except KeyboardInterrupt:
    print("\n\nProgram interrupted by user (Ctrl+C). Initiating clean shutdown...")

# Ensure stream and recording are stopped when the script is manually stopped
finally:
    print("\n--- Final Cleanup ---")
    try:
        # Stop Recording first
        record_status = client.get_record_status()
        if record_status.output_active:
             print("Final step: Stopping active recording.")
             client.stop_record()
             time.sleep(RECORD_STOP_DELAY) 
        
        # Stop Stream last
        stream_status = client.get_stream_status()
        if stream_status.output_active:
             print("Final step: Stopping the continuous stream.")
             client.stop_stream()
             
        print("Exiting cleanly.")
        
    except Exception as e:
        print(f"Finished. (Cleanup error ignored: {e})")