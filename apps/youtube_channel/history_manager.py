import os
import time
import pandas as pd
import config

def is_already_uploaded(indicator_title, folder_name, highest_is_best):
    """
    Checks if an indicator has already been successfully uploaded.
    
    Args:
        indicator_title: The name of the indicator to check
        folder_name: The source folder name (e.g., "_IMF")
        highest_is_best: The mode being run (True for Highest, False for Lowest)
        
    Returns:
        bool: True if already uploaded, False otherwise
    """
    if not os.path.exists(config.LOG_FILE):
        return False
    
    try:
        h_df = pd.read_csv(config.LOG_FILE)
        
        # Clean up the indicator_title we're checking
        cleaned_indicator = indicator_title.replace('\n', ' ').replace('\r', ' ').strip()
        
        # Determine the tag we are looking for in the title to distinguish modes
        mode_tag = "HIGHEST" if highest_is_best else "LOWEST"
        
        # 1. NEW: Check the explicit 'indicator' column (Robust Check)
        if 'indicator' in h_df.columns:
            # We look for matches where status is SUCCESS or SKIPPED
            # We replace semicolon back to comma for comparison since you log commas as semicolons
            h_df['indicator_clean'] = h_df['indicator'].astype(str).str.replace(';', ',').str.lower().str.strip()
            target = cleaned_indicator.lower().strip()
            
            # Filter for this indicator
            matches = h_df[h_df['indicator_clean'] == target]
            
            if not matches.empty:
                # IMPORTANT: Since we now run both modes, we only return True if 
                # this SPECIFIC mode (Highest or Lowest) has been recorded in the title.
                mode_matches = matches[matches['title'].astype(str).str.upper().str.contains(mode_tag)]
                if any(mode_matches['status'].isin(['SUCCESS', 'SKIPPED'])):
                    return True

        # 2. Your original check: indicator appears in any successful upload's title
        if 'title' in h_df.columns:
            h_df['title'] = h_df['title'].astype(str).str.replace('\n', ' ').str.replace('\r', ' ').str.strip()
            
            for idx, row in h_df[h_df['status'] == 'SUCCESS'].iterrows():
                # Check both the indicator name AND the mode tag to allow dual-mode processing
                if cleaned_indicator.lower() in row['title'].lower() and mode_tag in row['title'].upper():
                    return True
        
        return False
        
    except Exception as e:
        print(f"Warning: Could not read upload history: {e}")
        print("Continuing with upload...")
        return False


def log_upload_result(folder_name, indicator_title, youtube_title, video_id, status):
    """
    Logs the result of an upload attempt to the CSV history file.
    
    Args:
        folder_name: The source folder name (e.g., "_IMF")
        indicator_title: The raw indicator name
        youtube_title: The formatted YouTube title
        video_id: The YouTube video ID (or "N/A" if failed)
        status: "SUCCESS", "FAILED", or "SKIPPED"
    """
    # Clean data to prevent CSV corruption
    cleaned_indicator = indicator_title.replace('\n', ' ').replace('\r', ' ').replace(',', ';').strip()
    cleaned_title = youtube_title.replace('\n', ' ').replace('\r', ' ').replace(',', ';').strip()
    
    log_data = {
        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"), 
        'source': folder_name, 
        'indicator': cleaned_indicator,
        'title': cleaned_title, 
        'video_id': video_id if video_id else "N/A", 
        'status': status
    }
    
    # Write with proper escaping
    log_df = pd.DataFrame([log_data])
    log_df.to_csv(
        config.LOG_FILE, 
        # header=not os.path.exists(config.LOG_FILE) is slightly safer than the manual check
        mode='a', 
        header=not os.path.exists(config.LOG_FILE), 
        index=False, 
        quoting=1  # QUOTE_ALL - prevents CSV corruption
    )
    
    print(f"Logged to history: {status} - {cleaned_indicator}")