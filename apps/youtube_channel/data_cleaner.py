import pandas as pd

def analyze_data_quality(df, min_entities=50, min_time_steps=15):
    """
    Agnostic Auditor with zero hardcoded strings.
    - Dynamically detects Time, Value, and Entity columns.
    - Coerces non-numeric noise into NaN and drops it.
    - RESTORED: Full original quality metrics and audit report.
    - NEW: Static data check to reject boring datasets.
    """
    if df is None or df.empty:
        print("Cleaner Error: DataFrame is empty.")
        return None, "Empty DataFrame"

    # 1. DYNAMIC COLUMN DETECTION
    time_col = next((c for c in df.columns if c.lower() in ['year', 'date', 'timestamp']), df.columns[0])
    value_col = next((c for c in df.columns if c.lower() in ['value', 'score', 'amount', 'points']), df.columns[-1])
    
    potential_entities = [c for c in df.columns if c not in [time_col, value_col] and 'id' not in c.lower() and 'label' not in c.lower()]
    entity_col = potential_entities[0] if potential_entities else df.columns[0]

    # 2. SAFE NUMERIC CONVERSION
    df[time_col] = pd.to_numeric(df[time_col], errors='coerce')
    df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
    
    df = df.dropna(subset=[time_col, value_col]).copy()
    
    if df.empty:
        print("Cleaner Error: No numeric data remaining after cleaning.")
        return None, "No numeric data"

    df[time_col] = df[time_col].astype(int)

    # 3. STATIC DATA CHECK (New Logic)
    # Check if the data is boring (e.g., 90% of all values are the same number)
    val_counts = df[value_col].value_counts(normalize=True)
    if not val_counts.empty:
        top_val_pct = val_counts.iloc[0] * 100
        top_val_name = val_counts.index[0]
        if top_val_pct > 90.0:
            print(f"RESULT: [REJECTED] - Dataset is too static ({top_val_pct:.1f}% is {top_val_name}).")
            return None, f"STATIC: {top_val_pct:.1f}% is {top_val_name}"

    # 4. METRIC CALCULATION (Your original logic)
    active_entities = df[entity_col].unique()
    n = len(active_entities)
    total_time_steps = df[time_col].nunique()

    if n > 0 and total_time_steps > 0:
        counts_per_entity = df.groupby(entity_col)[time_col].count()
        avg_density_pct = (counts_per_entity.mean() / total_time_steps) * 100
    else:
        avg_density_pct = 0

    # 5. PRINT AUDIT REPORT (Your original logic)
    label = df['indicator_label'].iloc[0] if 'indicator_label' in df.columns else "Dataset"
    print(f"\n--- DATA QUALITY AUDIT: {label} ---")
    print(f"Entities Found: {n} (Target Min: {min_entities})")
    print(f"Time Steps:     {total_time_steps} (Target Min: {min_time_steps})")
    print(f"Avg Density:    {avg_density_pct:.1f}%")

    # 6. GATEKEEPER LOGIC (Your original logic)
    if n < min_entities:
        msg = f"REJECTED - Only {n} valid entities found. Needs {min_entities}."
        print(f"RESULT: {msg}")
        return None, msg
    
    if total_time_steps < min_time_steps:
        msg = f"REJECTED - Only {total_time_steps} time steps found. Needs {min_time_steps}."
        print(f"RESULT: {msg}")
        return None, msg
    
    if avg_density_pct < 15:
        msg = f"REJECTED - Data is too sparse ({avg_density_pct:.1f}% density)."
        print(f"RESULT: {msg}")
        return None, msg

    print("RESULT: [PASSED] - Quality meets all thresholds.")
    return df, "SUCCESS"