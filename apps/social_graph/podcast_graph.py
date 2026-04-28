import yt  
import db  
import ai
import wikidata
import time
import threading
import sys
import graph
from tqdm import tqdm

stop_event = threading.Event()
MAX_YOUTUBE_VIDEOS = 4000

def get_content_from_channels():
    # Fetch channels based on priority (conveyor belt logic)
    channels_to_scrape = db.get_channels_by_scrape_priority(2)

    if not channels_to_scrape:
        print("\n[Thread: Content] ✅ All channels are up to date.")
        return

    # Initialize the progress bar for the batch
    pbar = tqdm(
        channels_to_scrape, 
        desc="🌐 Scraping Channels", 
        unit="chan",
        bar_format="{l_bar}{bar:20}{n_fmt}/{total_fmt} [{percentage:3.0f}%] | {remaining} left"
    )

    for channel in pbar:
        if stop_event.is_set():
            pbar.set_description("🛑 Scrape Aborted")
            break
        
        c_id = channel['channel_id']
        c_name = channel['channel_name']
        channel_url = channel['url']

        pbar.set_description(f"🌐 Scraping: {c_name[:20]}")
        
        try:
            # yt.get_channel_data interacts with yt-dlp
            video_data_list = yt.get_channel_data(channel_url, fast=True)

            if video_data_list:
                if len(video_data_list) > MAX_YOUTUBE_VIDEOS:
                    pbar.write(f"⏩ Skipping {c_name}: Too many videos ({len(video_data_list)})")
                else:
                    db.save_video_content(video_data_list, c_id)
                    pbar.write(f"✅ Saved {len(video_data_list)} videos for {c_name}")

        except Exception as e:
            pbar.write(f"❌ Error on {c_name}: {e}")
        
        finally:
            # FIXED: Always update priority so dead links (404s) move to the back
            db.update_last_scrape_priority(c_id)
            time.sleep(1) 

    pbar.close()
    print("[Thread: Content] Batch complete.\n")

def tag_person_in_videos(batch_size=100):
    # Fetch next batch for AI processing
    videos = db.get_content_by_tag_priority(limit=batch_size)
    
    if not videos:
        print("[Thread: Tagging] No videos found to process.")
        return

    pbar = tqdm(
        videos, 
        desc="🏷️  Tagging People", 
        unit="vid",
        bar_format="{l_bar}{bar:30}{n_fmt}/{total_fmt} [{percentage:3.0f}%] | ETA: {remaining}"
    )

    for vid in pbar:
        if stop_event.is_set():
            pbar.set_description("🛑 Tagging Stopped")
            break
            
        post_id = vid['post_id']
        video_title = vid['title']

        try:
            # AI Name Extraction
            people_names = ai.get_names_from_title(video_title)
            
            if people_names:
                db.tag_people_in_video(post_id, people_names)
                pbar.set_postfix({"Found": people_names[0][:15]})
                
        except Exception as e:
            pbar.write(f"⚠️ Error on '{video_title[:30]}': {e}")
            
        finally:
            # FIXED: Always update priority so a "difficult" title doesn't hang the thread
            db.update_content_tag_priority(post_id)

    pbar.close()
    print(f"\n[Thread: Tagging] Batch of {len(videos)} processed.")

def search_people_to_get_new_channels():
    # Use priority getter for research targets
    names = db.get_people_by_discovery_priority(limit=2)
    
    if not names:
        print("[Thread: Discovery] No people found in database to research.")
        return

    new_found = 0

    pbar = tqdm(
        names, 
        desc="🔍 Discovering Channels", 
        unit="person",
        bar_format="{l_bar}{bar:30}{n_fmt}/{total_fmt} [{percentage:3.0f}%] | Found: {postfix} | {remaining} left"
    )

    for person in pbar:
        if stop_event.is_set():
            pbar.set_description("🛑 Discovery Stopped")
            break
        
        name_str = person['person_name']
        p_id = person['person_id']
        
        pbar.set_description(f"🔍 Researching: {name_str[:15]}")

        try:
            # External API call (Wikidata)
            data = wikidata.get_person_podcast_info(name_str)
            
            if data and data.get('channel_url'):
                was_inserted = db.insert_new_channel(
                    data.get('channel_title', 'Unknown'), 
                    data['channel_url'], 
                    p_id
                )
                
                if was_inserted:
                    new_found += 1
                    pbar.set_postfix_str(f"{new_found} new")
                    pbar.write(f"✨ Found new channel for {name_str}: {data.get('channel_title')}")

        except Exception as e:
            pbar.write(f"⚠️ Wikidata error for {name_str}: {e}")
        
        finally:
            # CRITICAL: Always move them to the back of the line
            db.update_person_discovery_priority(p_id)

    pbar.close()
    print(f"\n[Thread: Discovery] Cycle finished. Found {new_found} new channels.")

if __name__ == "__main__":
    # Main loop for continuous processing
    while True:
        try:
            start_loop = time.time()
            
            # 1. Scrape new videos from known channels
            get_content_from_channels()
            
            # 2. Extract people from newly scraped titles
            tag_person_in_videos()
            
            # 3. Research discovered people to find their official channels
            search_people_to_get_new_channels()
            
            # 4. Export results to the visual graph
            graph.export_to_visjs()
            
            elapsed = time.time() - start_loop
            print(f"--- [BATCH COMPLETE] Cycle time: {elapsed:.2f}s ---")
            
        except KeyboardInterrupt:
            print("\n🛑 Keyboard Interrupt detected. Cleaning up...")
            stop_event.set()
            break
        except Exception as e:
            print(f"🚨 CRITICAL CRASH in Main Loop: {e}")
            time.sleep(5) # Brief pause before attempting restart