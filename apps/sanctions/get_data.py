import requests
import pandas as pd
import io

# --- CONFIGURATION ---
TEST = False  # If True, we only keep the first 1000 rows
# ---------------------

def get_quick_sample():
    url = "https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv"
    
    print("--- Fetching Sanctions Data (Simplified CSV) ---")
    response = requests.get(url, stream=True)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        return

    lines = []
    line_count = 0
    max_lines = 1000 if TEST else 1000000 

    for line in response.iter_lines():
        if line:
            lines.append(line.decode('utf-8'))
            line_count += 1
            if line_count >= max_lines:
                break

    # Convert the list of strings into a DataFrame
    csv_data = "\n".join(lines)
    df = pd.read_csv(io.StringIO(csv_data))
    
    # Save the file
    output_file = "sanctions_sample.csv"
    df.to_csv(output_file, index=False)
    
    print(f"SUCCESS: Saved {len(df)} records to {output_file}")

    # FIXED COLUMNS: 
    # OpenSanctions Simple CSV uses 'name' and 'dataset'
    print("\n--- Top 10 Entries ---")
    print(df[['name', 'countries', 'dataset', 'first_seen']].head(10))

    # --- FURTHER PROCESSING EXAMPLE ---
    # Let's see which "Senders" (datasets) appear most in our sample
    print("\n--- Records per Sanctioning Dataset ---")
    print(df['dataset'].value_counts().head(5))

    return df

if __name__ == "__main__":
    df = get_quick_sample()