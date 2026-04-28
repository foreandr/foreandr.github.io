import os
FRED_API_KEY = '2d147c86611dcf8c75fea9a142b27171'

# Get the directory where THIS config.py file lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- GLOBAL SHARED PATHS ---
SONGS_DIR = os.path.join(BASE_DIR, "songs")
FLAGS_DIR = os.path.join(BASE_DIR, "country_flags")
CLIENT_SECRETS = os.path.join(BASE_DIR, "client_secrets.json")
LOG_FILE = os.path.join(BASE_DIR, "upload_history.csv") 

# --- GLOBAL SETTINGS ---
TARGET_SECONDS = 300
FPS = 24                
TOP_N = 15              
CPU_USAGE_CAP = 0.8     
DRY_RUN = False 

# --- RETENTION FLAGS ---
KEEP_LOCAL_VIDEO = False      
KEEP_LOCAL_THUMBNAIL = False

# --- ANIMATION SETTINGS ---
SURGE_DURATION_PCT = 10  

# --- SHARED BRANDING ---
CODE_BY = "Andre Foreman"
MUSIC_CREDIT = ""