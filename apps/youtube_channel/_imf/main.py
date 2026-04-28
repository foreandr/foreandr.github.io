import os
import sys
import pandas as pd
import time
from datetime import datetime

# --- LINK TO THE SHARED ENGINE ---
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pipeline
import progress_tracker

# --- PROJECT-SPECIFIC SETTINGS ---
DATA_SOURCE = "IMF https://www.imf.org/external/datamapper/api/v1/"
DATA_FILE = 'imf_data.csv'
CURRENT_YEAR = datetime.now().year
FOLDER_NAME = os.path.basename(os.path.dirname(os.path.abspath(__file__))).upper()

# --- MODULAR FUNCTIONS ---

def run_pipeline_task(indicator, mode, full_df, idx, total_indicators):
    """LEVEL 3: Executes a single pipeline run for one mode."""
    mode_label = "HIGHEST" if mode else "LOWEST"
    
    print(f"\n{'='*60}")
    print(f"INDICATOR {idx}/{total_indicators} | MODE: {mode_label}")
    print(f"TITLE: {indicator}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    pipeline.run(
        indicator_title=indicator,
        full_df=full_df,
        folder_name=FOLDER_NAME,
        data_source=DATA_SOURCE,
        highest_is_best=mode
    )
    
    elapsed = time.time() - start_time
    print(f"\n✓ {mode_label} run completed in {progress_tracker.format_time(elapsed)}")
    return elapsed


def handle_dual_modes(idx, indicator, full_df, total_indicators, main_tracker):
    """LEVEL 2: Manages the 'Highest' and 'Lowest' passes for a single indicator."""
    # List defines which modes to run. 
    # Logic for tracker depends on total_indicators * 2.
    # Note: False (Lowest) is currently omitted for UI compatibility.
    active_modes = [True] # , False 

    for mode in active_modes:
        run_pipeline_task(indicator, mode, full_df, idx, total_indicators)
        
        # Calculate current step for the tracker (1 for High, 2 for Low)
        current_step = ((idx - 1) * 2) + (1 if mode else 2)
        main_tracker.update(current_step, total_indicators * 2, "Total: ")



def process_indicators(full_df, all_indicators):
    """LEVEL 1: Top-level loop over the list of unique indicators."""
    total_indicators = len(all_indicators)
    main_tracker = progress_tracker.ProgressTracker(total_indicators * 2, "Overall Progress")
    start_time = time.time()

    for idx, indicator in enumerate(all_indicators, 1):
        handle_dual_modes(idx, indicator, full_df, total_indicators, main_tracker)
        # input("did one indicator, stopping")
    return time.time() - start_time


# --- ENTRY POINT ---

def main():
    """Initializes data and starts the processing workflow."""
    print(f"\n{'#'*60}")
    print(f"# IMF DATA VISUALIZATION PIPELINE (MODULAR)")
    print(f"# Starting: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}\n")
    
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return
    
    # Load data
    print("Loading data...")
    full_df = pd.read_csv(DATA_FILE, encoding='utf-8-sig')
    all_indicators = full_df['indicator_label'].unique()
    
    print(f"✓ Loaded {len(full_df)} records")
    print(f"✓ Found {len(all_indicators)} indicators to process\n")
    
    # Start the engine
    total_time = process_indicators(full_df, all_indicators)

    # Final summary
    print(f"\n\n{'#'*60}")
    print(f"# ALL INDICATORS PROCESSED")
    print(f"# Total time: {progress_tracker.format_time(total_time)}")
    print(f"{'#'*60}\n")


if __name__ == "__main__":
    main()