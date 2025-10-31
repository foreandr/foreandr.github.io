import time
from obsws_python import ReqClient
from obsws_python.error import OBSSDKRequestError

# --- Configuration ---
# IMPORTANT: Update these values to match your OBS Studio settings.
OBS_HOST = "localhost"
OBS_PORT = 4455
OBS_PASSWORD = "3zqvBCtapxZz4xwK"

# --- Cycle Durations ---
# Stream ON time: 5 minutes (300 seconds)
STREAM_DURATION_SECONDS = 5 * 60  
# Stream OFF time: 30 seconds
DOWN_TIME_SECONDS = 300          

# Connect to OBS
try:
    # Use a short timeout for the initial connection attempt
    client = ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD, timeout=5)
    print("✅ Successfully connected to OBS.")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    print("FATAL: Please ensure OBS is running and the WebSocket settings (Host, Port, Password) are correct.")
    exit()

# --- Initial Failsafe: Ensure Stream is OFF (Default State) ---
print("\n--- Failsafe Check: Setting Stream to Default OFF State ---")
try:
    status = client.get_stream_status()
    if status.output_active:
        print("⚠️ Stream is currently ON. Stopping stream to begin cycle.")
        client.stop_stream()
        # Give OBS a moment to process the stop command
        time.sleep(1) 
    else:
        print("✅ Stream is currently OFF. Ready to begin cycle.")

except Exception as e:
    print(f"❌ Failsafe Check Error: {e}")
    print("FATAL: Could not verify/stop stream status. Exiting.")
    exit()

# --- Main Infinite Loop ---
print("\n=======================================================")
print(f"Starting the ON/OFF stream cycle (5 min ON / 30 sec OFF).")
print("Press Ctrl+C to stop the program at any time.")
print("=======================================================\n")

try:
    while True:
        # 1. Start the stream
        try:
            print(f"--- STARTING STREAM | ON for {STREAM_DURATION_SECONDS} seconds ---")
            client.start_stream()
        except OBSSDKRequestError as e:
            # This handles the case where the stream might immediately become active again 
            # (e.g., if OBS auto-reconnects quickly). We just print a warning and continue.
            if "stream already active" in str(e):
                print("⚠️ Start request failed: Stream is already active. Proceeding with ON cycle.")
            else:
                # Re-raise any other critical error
                raise e 

        # 2. Wait for the stream duration (5 minutes)
        print(f"Stream is ON. Waiting for {STREAM_DURATION_SECONDS} seconds...")
        time.sleep(STREAM_DURATION_SECONDS)

        # 3. Stop the stream
        try:
            print(f"--- STOPPING STREAM | OFF for {DOWN_TIME_SECONDS} seconds ---")
            client.stop_stream()
        except OBSSDKRequestError as e:
             # This handles the case where the stream might have stopped unexpectedly.
            if "stream not active" in str(e):
                print("⚠️ Stop request failed: Stream is already inactive. Proceeding with OFF cycle.")
            else:
                # Re-raise any other critical error
                raise e 

        # 4. Wait for the down time (30 seconds)
        print(f"Stream is OFF. Waiting for {DOWN_TIME_SECONDS} seconds.")
        time.sleep(DOWN_TIME_SECONDS)

# --- Clean Exit Procedure ---
except KeyboardInterrupt:
    print("\n\nProgram interrupted by user (Ctrl+C). Initiating clean shutdown...")

# Ensure the stream is stopped when the script is manually stopped
finally:
    try:
        current_status = client.get_stream_status()
        if current_status.output_active:
             print("Final step: Stopping the active stream before exiting.")
             client.stop_stream()
        else:
             print("Stream is already stopped. Exiting cleanly.")
    except Exception as e:
        # Ignore errors if the connection was already lost or OBS closed
        print(f"Finished. (Cleanup error ignored: {e})")