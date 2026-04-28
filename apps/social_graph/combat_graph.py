import yt_dlp
import sqlite3
from datetime import datetime
from tqdm import tqdm
import time
import graph
import ai  # Your separate ai.py file

# --- DATABASE LAYER ---

def init_db(db_name="combat_vault.db", reset=False):
    """Initializes the database schema and resets tables if necessary."""
    conn = sqlite3.connect(db_name)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    if reset:
        print("Refreshing schema (Resetting Database)...")
        cursor.execute("DROP TABLE IF EXISTS people_in_content")
        cursor.execute("DROP TABLE IF EXISTS content")
        cursor.execute("DROP TABLE IF EXISTS channels")
        cursor.execute("DROP TABLE IF EXISTS people")

        # 1. PEOPLE: Central node for the graph
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS people (
                person_id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_name TEXT NOT NULL UNIQUE,
                discovery_priority INTEGER DEFAULT 0
            )
        ''')

        # 2. CHANNELS
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS channels (
                channel_id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_name TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                youtube_id TEXT, 
                channel_owner_id INTEGER,
                scrape_priority INTEGER DEFAULT 0, 
                last_scrape_time TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_owner_id) REFERENCES people (person_id)
            )
        ''')

        # 3. CONTENT
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS content (
                post_id TEXT PRIMARY KEY, 
                channel_id INTEGER NOT NULL,
                title TEXT,
                description TEXT,
                upload_time TEXT,
                crawl_time TEXT DEFAULT CURRENT_TIMESTAMP,
                tag_priority INTEGER DEFAULT 0,
                most_recent_tag TEXT,
                FOREIGN KEY (channel_id) REFERENCES channels (channel_id)
            )
        ''')

        # 4. RELATIONSHIP (Social Graph Junction)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS people_in_content (
                post_id TEXT NOT NULL,
                person_id INTEGER NOT NULL,
                PRIMARY KEY (post_id, person_id),
                FOREIGN KEY (post_id) REFERENCES content (post_id) ON DELETE CASCADE,
                FOREIGN KEY (person_id) REFERENCES people (person_id) ON DELETE CASCADE
            )
        ''')

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_person_priority ON people(discovery_priority);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chan_priority ON channels(scrape_priority);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_priority ON content(tag_priority);")
        
        conn.commit()
        print("Database Initialized.")
    return conn

def get_or_create_channel(conn, base_url):
    cursor = conn.cursor()
    video_tab_url = base_url.rstrip('/') + '/videos'
    cursor.execute("SELECT channel_id FROM channels WHERE url = ?", (base_url,))
    row = cursor.fetchone()
    if row:
        return row[0], video_tab_url
    
    channel_name = base_url.split('@')[-1] if '@' in base_url else base_url.split('/')[-1]
    cursor.execute("INSERT INTO channels (channel_name, url) VALUES (?, ?)", (channel_name, base_url))
    conn.commit()
    return cursor.lastrowid, video_tab_url

def update_content_tag_priority(conn, post_id):
    cursor = conn.cursor()
    cursor.execute("UPDATE content SET tag_priority = tag_priority + 1 WHERE post_id = ?", (post_id,))
    conn.commit()

def tag_people_in_video(conn, post_id, names):
    """Saves AI-extracted names into the people and relationship tables."""
    cursor = conn.cursor()
    for name in names:
        # Ensure the person exists
        cursor.execute("INSERT OR IGNORE INTO people (person_name) VALUES (?)", (name,))
        cursor.execute("SELECT person_id FROM people WHERE person_name = ?", (name,))
        person_id = cursor.fetchone()[0]
        
        # Link them to this specific video
        cursor.execute('''
            INSERT OR IGNORE INTO people_in_content (post_id, person_id) 
            VALUES (?, ?)
        ''', (post_id, person_id))
    conn.commit()

# --- SCRAPING ENGINE ---

def scrape_channel_videos(conn, channel_id, video_url):
    chunk_size = 100
    current_start = 1
    total_found = 0

    while True:
        video_range = f"{current_start}-{current_start + chunk_size - 1}"
        ydl_opts = {
            'extract_flat': 'in_playlist',
            'playlist_items': video_range,
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                result = ydl.extract_info(video_url, download=False)
                if result and 'entries' in result:
                    videos = list(result['entries'])
                    if not videos:
                        break 
                    
                    cursor = conn.cursor()
                    for video in videos:
                        if video:
                            cursor.execute('''
                                INSERT OR IGNORE INTO content (post_id, channel_id, title, description, upload_time)
                                VALUES (?, ?, ?, ?, ?)
                            ''', (
                                video.get('id'),
                                channel_id,
                                video.get('title'),
                                video.get('description'),
                                video.get('upload_date')
                            ))
                            total_found += 1
                    
                    conn.commit()
                    print(f"   > Scraped {len(videos)} videos (Total: {total_found})...")
                    
                    # RUN TAGGING & GRAPH EXPORT PER BATCH
                    run_tagging_cycle(conn, batch_size=100)
                    graph.export_combat_social_graph(db_name="combat_vault.db", js_filename="combat_data.js")

                    if len(videos) < chunk_size:
                        break
                    current_start += chunk_size
                else:
                    break
            except Exception as e:
                print(f"   > Error in batch: {e}")
                break
    
    print(f"   > Channel complete. Total videos indexed: {total_found}")

# --- TAGGING ENGINE ---

def run_tagging_cycle(conn, batch_size=100):
    """Processes untagged videos using the imported AI module."""
    cursor = conn.cursor()
    cursor.execute("SELECT post_id, title FROM content WHERE tag_priority = 0 LIMIT ?", (batch_size,))
    rows = cursor.fetchall()
    
    if not rows:
        return

    videos = [{'post_id': r[0], 'title': r[1]} for r in rows]

    pbar = tqdm(
        videos, 
        desc="🏷️ Tagging People", 
        unit="vid",
        bar_format="{l_bar}{bar:30}{n_fmt}/{total_fmt} [{percentage:3.0f}%] | ETA: {remaining}"
    )

    for vid in pbar:
        post_id = vid['post_id']
        video_title = vid['title']

        try:
            # Call function from imported ai.py
            people_names = ai.get_names_from_title(video_title)
            
            if people_names:
                tag_people_in_video(conn, post_id, people_names)
                pbar.set_postfix({"Found": f"{len(people_names)} names"})
                
        except Exception as e:
            pbar.write(f"⚠️ AI Error on '{video_title[:30]}': {e}")
        finally:
            update_content_tag_priority(conn, post_id)

    pbar.close()

# --- MAIN EXECUTION ---

def print_recent_tags(conn, limit=20):
    """Prints a summary of recent videos and the people tagged in them."""
    cursor = conn.cursor()
    query = '''
        SELECT 
            c.title, 
            GROUP_CONCAT(p.person_name, ', ') as tagged_people
        FROM content c
        JOIN people_in_content pic ON c.post_id = pic.post_id
        JOIN people p ON pic.person_id = p.person_id
        GROUP BY c.post_id
        ORDER BY c.crawl_time DESC
        LIMIT ?
    '''
    cursor.execute(query, (limit,))
    rows = cursor.fetchall()

    print("\n" + "="*80)
    print(f"{'VIDEO TITLE':<50} | {'TAGGED PEOPLE'}")
    print("-"*80)
    
    if not rows:
        print("No tags found yet. Run the scraper/tagger first!")
    else:
        for title, people in rows:
            # Truncate long titles for clean printing
            display_title = (title[:47] + '...') if len(title) > 50 else title
            print(f"{display_title:<50} | {people}")
    print("="*80 + "\n")

if __name__ == "__main__":
    # Initialize DB (Set reset=True only if you want to wipe everything)
    db_conn = init_db("combat_vault.db", reset=True)
    channels = [
        # === MMA ORGANIZATIONS (ACTUAL FIGHT FOOTAGE) ===
        "https://www.youtube.com/channel/UCvgfXK4nTYKudb0rFR6noLA", # UFC - Full fights, highlights
        "https://www.youtube.com/@UFCFightPass", # UFC Fight Pass - Extended fight library
        "https://www.youtube.com/@BellatorMMA", # Bellator MMA - Full fights, highlights
        "https://www.youtube.com/@ONEChampionship", # ONE Championship - Full fights, extensive library
        "https://www.youtube.com/@PFLMMA", # Professional Fighters League - Full fights
        "https://www.youtube.com/@RizinFF", # Rizin Fighting Federation - Full Japanese fights
        "https://www.youtube.com/@KSW", # KSW - European MMA fights
        "https://www.youtube.com/@OktagonMMA", # Oktagon MMA - European fights
        "https://www.youtube.com/@CageWarriorsTV", # Cage Warriors - UK/Europe fights
        "https://www.youtube.com/@LFATV", # Legacy Fighting Alliance - Regional MMA fights
        "https://www.youtube.com/@invictafc", # Invicta Fighting Championships - Women's MMA fights
        "https://www.youtube.com/@BAMMA", # BAMMA - UK MMA fights
        "https://www.youtube.com/@M1GlobalOfficial", # M-1 Global - Russian MMA fights
        "https://www.youtube.com/@ROADFC", # Road Fighting Championship - Korean MMA
        "https://www.youtube.com/@PancraseDream", # Pancrase - Japanese MMA
        "https://www.youtube.com/@ShootoOfficial", # Shooto - Japanese MMA
        "https://www.youtube.com/@CFFC", # Cage Fury Fighting Championships
        "https://www.youtube.com/@TitanFC", # Titan Fighting Championship
        "https://www.youtube.com/@XFC", # Xtreme Fighting Championships
        "https://www.youtube.com/@CombateGlobal", # Combate Global
        "https://www.youtube.com/@BraveMMAww", # Brave Combat Federation
        
        # === SLAP FIGHTING (ACTUAL COMPETITIONS) ===
        "https://www.youtube.com/powerslap", # Power Slap - Dana White's League (A vs B slap competitions)
        "https://www.youtube.com/@SlapFightChampionship", # SlapFight Championship
        
        # === BOXING ORGANIZATIONS (FIGHT FOOTAGE) ===
        "https://www.youtube.com/@MatchroomBoxing", # Matchroom Boxing - Full fights, highlights
        "https://www.youtube.com/@TopRankBoxing", # Top Rank Boxing - Full fights
        "https://www.youtube.com/@GoldenBoyBoxing", # Golden Boy Promotions - Fights
        "https://www.youtube.com/@showtimeboxing", # Showtime Boxing - Fight highlights
        "https://www.youtube.com/@DAZNBoxing", # DAZN Boxing - Fight content
        "https://www.youtube.com/@PBConFOX", # Premier Boxing Champions - FOX fights
        "https://www.youtube.com/@ESPNBoxing", # ESPN Boxing - Fight highlights
        "https://www.youtube.com/@ZuffaBoxing", # Zuffa Boxing - Fight content
        
        # === BARE KNUCKLE BOXING (FIGHT CONTENT) ===
        "https://www.youtube.com/@bareknucklefc", # BKFC - Full bare knuckle fights
        "https://www.youtube.com/@BYBExtreme", # BYB Extreme Fighting Series
        
        # === KICKBOXING & MUAY THAI (FIGHT FOOTAGE) ===
        "https://www.youtube.com/@GloryKickboxing", # Glory Kickboxing - Full fights, tournaments
        "https://www.youtube.com/@K1", # K-1 - Japanese kickboxing fights
        "https://www.youtube.com/@MaxMuayThaiOfficial", # Max Muay Thai - Thailand fights
        "https://www.youtube.com/@RWS_Official", # Rajadamnern World Series - Muay Thai fights
        "https://www.youtube.com/@LumpineeBoxingStadium", # Lumpinee Boxing Stadium - Thai fights
        "https://www.youtube.com/@SUPERKOMBAT", # Superkombat - Romanian kickboxing
        "https://www.youtube.com/@enfusionlive", # Enfusion - Dutch kickboxing
        "https://www.youtube.com/@KickboxingPromotion", # Various kickboxing fights
        
        # === GRAPPLING & SUBMISSION WRESTLING (COMPETITIVE MATCHES) ===
        "https://www.youtube.com/@ADCC_Official", # ADCC - Premier submission wrestling tournaments
        "https://www.youtube.com/@PolarisProfessionalJiuJitsu", # Polaris Pro - Grappling matches
        "https://www.youtube.com/@FloGrappling", # FloGrappling - Various grappling competitions
        "https://www.youtube.com/@WhosBadGrappling", # Who's Bad Grappling - Competition matches
        "https://www.youtube.com/@SubmissionUnderground", # Submission Underground (SUG) - Matches
        "https://www.youtube.com/@QuintetsofficialdOFFICIAL", # Quintet - Team grappling matches
        "https://www.youtube.com/@GrapplefestOfficial", # Grapplefest - Grappling competitions
        "https://www.youtube.com/@CombatJiuJitsu", # Combat Jiu-Jitsu - Competitive matches
        
        # === PROFESSIONAL WRESTLING (MATCH FOOTAGE) ===
        "https://www.youtube.com/@WWE", # WWE - Match highlights, full matches
        "https://www.youtube.com/@AEWrestling", # All Elite Wrestling - Match content
        "https://www.youtube.com/@njpwworld", # New Japan Pro Wrestling - Match footage
        "https://www.youtube.com/@IMPACTWRESTLING", # Impact Wrestling - Match highlights
        "https://www.youtube.com/@ringofhonor", # Ring of Honor Wrestling - Matches
        "https://www.youtube.com/@officialnwa", # National Wrestling Alliance - Matches
        "https://www.youtube.com/@GameChangerWrestling", # Game Changer Wrestling - Indie matches
        "https://www.youtube.com/@beyondwrestling", # Beyond Wrestling - Indie matches
        "https://www.youtube.com/@cmll", # CMLL - Mexican wrestling matches
        "https://www.youtube.com/@AAALucha", # AAA Wrestling - Mexican lucha matches
        "https://www.youtube.com/@StardomWorld", # Stardom - Japanese women's wrestling
        "https://www.youtube.com/@dragongate", # Dragon Gate - Japanese wrestling
        "https://www.youtube.com/@ajpwofficial", # All Japan Pro Wrestling
        "https://www.youtube.com/@noahglobal", # Pro Wrestling NOAH
        "https://www.youtube.com/@DDTpro", # DDT Pro Wrestling
        "https://www.youtube.com/@TJPW", # Tokyo Joshi Pro Wrestling
        
        # === KARATE (COMPETITIVE FIGHTS) ===
        "https://www.youtube.com/@KarateCombat", # Karate Combat - Full contact karate fights
        
        # === RUSSIAN/EASTERN EUROPEAN COMBAT (FIGHT CONTENT) ===
        "https://www.youtube.com/c/HardcoreFightingChampionship/videos", # Hardcore FC - Russian fights
        "https://www.youtube.com/@TopDogFC", # Top Dog Fighting Championship - Russian bare knuckle
        "https://www.youtube.com/c/RFCRussianFightClub", # RFC - Russian fight club
        "https://www.youtube.com/@NasheDeloOfficial", # Nashe Delo - Russian underground fights
        "https://www.youtube.com/@Fight_Nights_Global", # Fight Nights Global - Russian boxing/MMA
        
        # === REGIONAL ORGANIZATIONS WITH FIGHT CONTENT ===
        "https://www.youtube.com/@EternalMMA", # Eternal MMA - Australia/New Zealand
        "https://www.youtube.com/@ARES_FC", # Ares FC - Czech Republic
        "https://www.youtube.com/@SuperFightLeague", # Super Fight League - India
        "https://www.youtube.com/@DEEPjewels", # DEEP - Japanese MMA
        "https://www.youtube.com/@zst", # ZST - Japanese MMA
        
        # === HISTORICAL/TRADITIONAL COMBAT (ACTUAL COMPETITIONS) ===
        "https://www.youtube.com/@HEMAOfficial", # HEMA - Historical European martial arts tournaments
        "https://www.youtube.com/@LongSwordOfficial", # Longsword tournaments
        "https://www.youtube.com/@IMCF", # International Medieval Combat Federation - Armored combat
        
        # === SPECIALIZED COMBAT SPORTS (COMPETITIVE MATCHES) ===
        "https://www.youtube.com/@SamboFIAS", # FIAS Sambo - International sambo competitions
        "https://www.youtube.com/@SumoOfficial", # Japan Sumo Association - Sumo tournaments
        "https://www.youtube.com/@WorldSumo", # International Sumo Federation
        
        # === COMBAT SPORTS BROADCASTERS (FIGHT CONTENT) ===
        "https://www.youtube.com/@FightNetwork", # Fight Network - Various fight content
        "https://www.youtube.com/@AxsTVFights", # AXS TV Fights - Fight broadcasts
        "https://www.youtube.com/@FIGHTSPORTS", # Fight Sports - Fight content
        
        # === INDEPENDENT/UNDERGROUND ORGANIZATIONS (ACTUAL FIGHTS) ===
        "https://www.youtube.com/@TheScrapyardFights", # Scrapyard Fights - Legal backyard organization
        "https://www.youtube.com/@StreetBeefs", # Street Beefs - Organized backyard fights
        "https://www.youtube.com/@FIGHTTVOfficial", # FIGHT.TV - Multi-org fight content
    ]

    print("\n--- STARTING CONVEYOR BELT ---")
    for channel_url in channels:
        print(f"\nProcessing Channel: {channel_url}")
        chan_id, video_tab = get_or_create_channel(db_conn, channel_url)
        scrape_channel_videos(db_conn, chan_id, video_tab)

    db_conn.close()
    print("\nSession complete.")