import requests
import csv
import os

base_link = 'https://api.nsfwdog.com/v1/subreddits/top/?ordering=-subscribers&page=@page_no'
pages = 1716
file_path = 'subreddits.csv'

def main():
    # 1. Open the file once in 'w' (write) mode to add the header
    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["Name", "Path"]) # Header
        
        # 2. Start the loop
        for i in range(1, pages + 1):
            url = base_link.replace("@page_no", str(i))
            print(f"Requesting URL: {url}")
            
            try:
                response = requests.get(url)
                if response.status_code != 200:
                    print(f"Failed page {i}. Status: {response.status_code}")
                    continue

                data = response.json()
                items = data.get('results', [])
                
                if items:
                    # 3. Write each item immediately to the file
                    for item in items:
                        writer.writerow([item['heading'], item['url_path']])
                    
                    # Flush ensures data is written to disk even if script crashes
                    file.flush() 
                    print(f"Page {i} saved. Found {len(items)} items.")
                else:
                    print(f"No items on page {i}. Stopping.")
                    break # Stop if we hit an empty page

            except Exception as e:
                print(f"Error on page {i}: {e}")
                continue

    print(f"Finished! Data is in {file_path}")

if __name__ == "__main__":
    main()