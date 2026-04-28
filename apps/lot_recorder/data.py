# --- Public/live info you already had ---
youtube_live_link = "https://youtube.com/live/erjqYSV3GWA?feature=share"

# --- OBS connection/config ---
OBS_HOST = "localhost"
OBS_PORT = 4455
OBS_PASSWORD = "5jcj1s4uOH9fV0HO"
OBS_TIMEOUT = 5  # seconds for ReqClient timeout

# --- Scheduling / timing ---
RECORD_SEGMENT_SECONDS = 60 *10  *12# 3* 3600       # 1 hours
RECORD_STOP_DELAY = 5.0               # seconds to let OBS finalize
STREAM_CHECK_INTERVAL_SECONDS = 1800  # 30 minutes
GIT_INTERVAL_SECONDS = 15             # git push cadence (seconds)

# --- FOLDER SETTINGS ---
# This is where OBS saves your recordings. 
# Make sure this matches your OBS -> Settings -> Output -> Recording Path
VIDEO_DIR = r"C:\Users\User\Videos" 

# --- Daily maintenance window (local time) ---
MAINTENANCE_HOUR = 4                  # 4 AM local
MAINTENANCE_MINUTE = 0
MAINTENANCE_DOWNTIME_MIN = 45         # stop stream for this many minutes
MAINTENANCE_CHECK_INTERVAL_SEC = 20   # how often to check the clock
MAINTENANCE_TRIGGER_WINDOW_SEC = 300  # 5 min window around the target time
MAINTENANCE_DEDUP_WINDOW_SEC = 300    # don't trigger again if fired within last 5 min