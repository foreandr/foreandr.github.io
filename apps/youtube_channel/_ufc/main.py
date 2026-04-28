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
DATA_SOURCE = "UFC Fight Statistics"
DATA_FILE = 'ufc-master.csv'
CURRENT_YEAR = datetime.now().year
FOLDER_NAME = os.path.basename(os.path.dirname(os.path.abspath(__file__))).upper()

# --- INDICATOR DEFINITIONS ---
# These are the metrics we want to track and visualize
UFC_INDICATORS = {
    # Striking & Precision
    "Average Significant Strikes Landed Per Fight": ("BlueAvgSigStrLanded", "RedAvgSigStrLanded", "Strikes per Fight"),
    "Significant Strike Accuracy": ("BlueAvgSigStrPct", "RedAvgSigStrPct", "Percentage"),
    
    # Grappling & Control
    "Average Takedowns Landed Per Fight": ("BlueAvgTDLanded", "RedAvgTDLanded", "Takedowns per 15 min"),
    "Takedown Accuracy": ("BlueAvgTDPct", "RedAvgTDPct", "Percentage"),
    "Average Submission Attempts Per Fight": ("BlueAvgSubAtt", "RedAvgSubAtt", "Attempts per Fight"),
    
    # Achievement & Longevity
    "Total Career Wins": ("BlueWins", "RedWins", "Wins"),
    "Total Title Bouts": ("BlueTotalTitleBouts", "RedTotalTitleBouts", "Title Fights"),
    "Total Rounds Fought": ("BlueTotalRoundsFought", "RedTotalRoundsFought", "Rounds"),
    
    # Finishing Methods
    "Wins by Knockout": ("BlueWinsByKO", "RedWinsByKO", "KO Wins"),
    "Wins by Submission": ("BlueWinsBySubmission", "RedWinsBySubmission", "Submission Wins"),
}

def transform_ufc_to_pipeline_format(raw_df):
    """
    Transforms UFC fighter vs fighter data into the multi-entity format the pipeline expects.
    
    Instead of countries, we have fighters.
    Instead of years, we use the date of each fight as a "snapshot" of their stats at that time.
    """
    print("🔄 Transforming UFC data into pipeline format...")
    
    all_rows = []
    
    # Process each fight
    for _, fight in raw_df.iterrows():
        # Extract year from date
        try:
            year = pd.to_datetime(fight['Date']).year
        except:
            continue
        
        # Process Blue corner fighter
        blue_fighter = fight['BlueFighter']
        if pd.notna(blue_fighter) and blue_fighter.strip():
            for indicator_name, (blue_col, red_col, unit) in UFC_INDICATORS.items():
                value = fight.get(blue_col)
                if pd.notna(value):
                    all_rows.append({
                        'country': blue_fighter,  # Using 'country' field for fighter name
                        'iso3': 'UFC',  # Placeholder
                        'year': year,
                        'indicator_label': indicator_name,
                        'unit': unit,
                        'value': float(value)
                    })
        
        # Process Red corner fighter
        red_fighter = fight['RedFighter']
        if pd.notna(red_fighter) and red_fighter.strip():
            for indicator_name, (blue_col, red_col, unit) in UFC_INDICATORS.items():
                value = fight.get(red_col)
                if pd.notna(value):
                    all_rows.append({
                        'country': red_fighter,  # Using 'country' field for fighter name
                        'iso3': 'UFC',  # Placeholder
                        'year': year,
                        'indicator_label': indicator_name,
                        'unit': unit,
                        'value': float(value)
                    })
    
    # Create dataframe
    transformed_df = pd.DataFrame(all_rows)
    
    # Take the most recent stats for each fighter per year (since they fight multiple times)
    # We keep the maximum value for cumulative stats and average for rate stats
    transformed_df = transformed_df.sort_values('year')
    transformed_df = transformed_df.groupby(['country', 'year', 'indicator_label']).agg({
        'value': 'last',  # Take the most recent value
        'iso3': 'first',
        'unit': 'first'
    }).reset_index()
    
    print(f"✓ Transformed {len(all_rows)} fight records into {len(transformed_df)} stat records")
    print(f"✓ Tracking {transformed_df['country'].nunique()} fighters")
    print(f"✓ Across {transformed_df['indicator_label'].nunique()} indicators")
    print(f"✓ From {transformed_df['year'].min()} to {transformed_df['year'].max()}")
    
    return transformed_df

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
    # For UFC, we typically only care about "HIGHEST" (best fighters)
    # But you can enable both if you want "worst" rankings too
    active_modes = [True]  # , False 
    
    for mode in active_modes:
        run_pipeline_task(indicator, mode, full_df, idx, total_indicators)
        
        # Calculate current step for the tracker
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
    print(f"# UFC FIGHTER STATISTICS VISUALIZATION PIPELINE")
    print(f"# Starting: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'#'*60}\n")
    
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return
    
    # Load raw UFC data
    print("Loading UFC fight data...")
    raw_df = pd.read_csv(DATA_FILE, encoding='utf-8-sig', low_memory=False)
    
    print(f"✓ Loaded {len(raw_df)} UFC fights")
    
    # Transform into pipeline format
    full_df = transform_ufc_to_pipeline_format(raw_df)
    
    # Filter to valid years
    full_df = full_df[full_df['year'] <= CURRENT_YEAR].copy()
    
    all_indicators = list(UFC_INDICATORS.keys())
    
    print(f"\n✓ Ready to process {len(all_indicators)} indicators\n")
    
    # Start the engine
    total_time = process_indicators(full_df, all_indicators)
    
    # Final summary
    print(f"\n\n{'#'*60}")
    print(f"# ALL INDICATORS PROCESSED")
    print(f"# Total time: {progress_tracker.format_time(total_time)}")
    print(f"{'#'*60}\n")

if __name__ == "__main__":
    input("NOT THAT ITS NOT INTERESTING OR POSSIBLE, BUT RN ID LIEK TO FOCUS ON NATIONS ")
    main()