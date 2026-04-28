import pandas as pd
import json

def process_csv_to_js(input_csv, output_js):
    # Load the CSV
    df = pd.read_csv(input_csv)

    # Clean up the data for JS usage
    # We split semicolon strings into actual lists so they are easy to use in JS
    list_columns = ['aliases', 'countries', 'dataset', 'program_ids']
    
    records = []
    for _, row in df.iterrows():
        entry = row.to_dict()
        
        for col in list_columns:
            if isinstance(entry.get(col), str):
                # Split by semicolon and strip whitespace
                entry[col] = [item.strip() for item in entry[col].split(';')]
            else:
                entry[col] = [] # Handle empty/NaN values
        
        records.append(entry)

    # Convert to a JS file
    # We wrap it in 'const SANCTIONS_DATA = ...' so you can just script-tag it in HTML
    with open(output_js, 'w', encoding='utf-8') as f:
        f.write("const SANCTIONS_DATA = ")
        json.dump(records, f, indent=4, ensure_ascii=False)
        f.write(";")

    print(f"Success! Processed {len(records)} records into {output_js}")

if __name__ == "__main__":
    process_csv_to_js('sanctions_sample.csv', 'sanctions_data.js')