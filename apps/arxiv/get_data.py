import requests
import xml.etree.ElementTree as ET
import csv
import time
import os
import re

# --- SETTINGS ---
outfile = "arxiv_titles_urls.csv"
base_url = "http://export.arxiv.org/api/query?"
max_results = 100 
wait_time = 4 

# To keep track of what we've already done in this session
seen_ids = set()

def fetch_batch(year, month, start_index):
    m_str = f"{month:02d}"
    # Target specific month to avoid server 500 errors
    date_query = f"submittedDate:[{year}{m_str}010000 TO {year}{m_str}312359]"
    
    url = (
        f"{base_url}search_query={date_query}"
        f"&start={start_index}"
        f"&max_results={max_results}"
        f"&sortBy=submittedDate"
        f"&sortOrder=ascending"
    )
    
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.text
        if response.status_code == 503:
            print("ArXiv is busy (503). Waiting 30s...")
            time.sleep(30)
        return None
    except Exception as e:
        print(f"Network error: {e}")
        return None

def parse_and_save(xml_data, csv_writer):
    try:
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall("atom:entry", ns)
        
        new_count = 0
        for entry in entries:
            url = entry.find("atom:id", ns).text.strip()
            # Unique ID is the end of the URL
            paper_id = url.split('/')[-1]
            
            if paper_id not in seen_ids:
                title = entry.find("atom:title", ns).text.strip().replace('\n', ' ')
                csv_writer.writerow([title, url])
                seen_ids.add(paper_id)
                new_count += 1
        return len(entries), new_count
    except Exception as e:
        print(f"Parse error: {e}")
        return 0, 0

def main():
    # 'a' means append, so we never delete what you already have
    file_exists = os.path.isfile(outfile)
    
    with open(outfile, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["title", "url"])

        # Loop through years and months
        for year in range(2026, 1990, -1):
            for month in range(12, 0, -1):
                start = 0
                print(f"\n>>> SCRAPING: {year}-{month:02d}")
                
                while True:
                    xml_text = fetch_batch(year, month, start)
                    if not xml_text:
                        break # Move to next month if server fails
                    
                    total_found, newly_added = parse_and_save(xml_text, writer)
                    
                    if total_found == 0:
                        break # No more papers in this month
                    
                    f.flush() # Forces the data into the CSV immediately
                    print(f"Batch {start}: Added {newly_added} new (Total session: {len(seen_ids)})")
                    
                    start += max_results
                    time.sleep(wait_time)

if __name__ == "__main__":
    main()