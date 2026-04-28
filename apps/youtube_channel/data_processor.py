import pandas as pd
import config
import progress_tracker

def prepare_indicator_data(full_df, indicator_title, highest_is_best):
    """
    Prepares and validates data for a specific indicator.
    
    Args:
        full_df: Complete dataframe with all indicators
        indicator_title: Name of the indicator to process
        highest_is_best: Whether higher values are better
        
    Returns:
        tuple: (cleaned_df, years, x_min, x_max, unit_label) or (None, None, None, None, None) if invalid
    """
    tracker = progress_tracker.ProgressTracker(5, "Data Preparation")
    tracker.start_step("Extracting indicator data")
    
    # Extract data for this specific indicator
    df = full_df[full_df['indicator_label'].str.strip() == indicator_title].copy()
    
    if df.empty:
        print(f"No data found for {indicator_title}. Skipping.")
        return None, None, None, None, None
    
    # Extract unit label (should be consistent across all rows for this indicator)
    unit_label = "Value"  # Default fallback
    if 'unit' in df.columns:
        unit_values = df['unit'].dropna().unique()
        if len(unit_values) > 0:
            unit_label = str(unit_values[0])
    
    tracker.complete_step()
    tracker.start_step("Deduplicating records")
    
    # Deduplication - prevents reindex errors
    df = df.groupby(['country', 'year']).agg({
        'value': 'mean', 
        'iso3': 'first', 
        'indicator_label': 'first',
        'unit': 'first'
    }).reset_index()
    
    tracker.complete_step()
    tracker.start_step("Validating data quality")
    
    years = sorted(df['year'].unique())
    if len(years) < 2:
        print(f"Not enough years of data for {indicator_title}. Skipping.")
        return None, None, None, None, None
    
    tracker.complete_step()
    tracker.start_step("Calculating axis bounds")
    
    # Calculate axis bounds
    winning_stats = pd.concat([
        df[df['year'] == y].sort_values('value', ascending=not highest_is_best).head(config.TOP_N) 
        for y in years
    ])
    x_min = min(0, winning_stats['value'].min())
    x_max = winning_stats['value'].max()
    
    tracker.complete_step()
    
    print(f"✓ Data prepared: {len(df)} records, {len(years)} years, {df['country'].nunique()} countries")
    print(f"✓ Unit label: {unit_label}")
    
    return df, years, x_min, x_max, unit_label