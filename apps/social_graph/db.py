import sqlite3
from datetime import datetime
import random

import sqlite3

import sqlite3
from tqdm import tqdm
import time

def init_db(db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

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

    # 2. CHANNELS: Track when we last checked for new videos
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

    # 3. CONTENT: Track individual videos and their tagging status
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

    # 4. RELATIONSHIP: Junction table for the Social Graph
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS people_in_content (
            post_id TEXT NOT NULL,
            person_id INTEGER NOT NULL,
            PRIMARY KEY (post_id, person_id),
            FOREIGN KEY (post_id) REFERENCES content (post_id) ON DELETE CASCADE,
            FOREIGN KEY (person_id) REFERENCES people (person_id) ON DELETE CASCADE
        )
    ''')

    # INDEXES: Optimized for the conveyor belt sorting
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_person_priority ON people(discovery_priority);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chan_priority ON channels(scrape_priority);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_priority ON content(tag_priority);")
    
    conn.commit()
    conn.close()
    print("Database Initialized with Discovery, Scrape, and Tag Priority Logic.")

def seed_data(db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # 100 Podcasts where the FIRST index is strictly the OWNER'S NAME
    data_to_seed = [
        ("Joe Rogan", "The Joe Rogan Experience", "https://www.youtube.com/@joerogan"),
        ("Lex Fridman", "Lex Fridman Podcast", "https://www.youtube.com/@lexfridman"),
        ("Eric Weinstein", "The Portal", "https://www.youtube.com/@EricWeinsteinPhD"),
        ("Curt Jaimungal", "Theories of Everything with Curt Jaimungal", "https://www.youtube.com/@TheoriesofEverything"),
        ("Balaji Srinivasan", "The Network State Podcast", "https://www.youtube.com/@nspodcast"),
        ("Andrew Huberman", "Huberman Lab", "https://www.youtube.com/@hubermanlab"),
        ("Theo Von", "This Past Weekend", "https://www.youtube.com/@TheoVon"),
        ("Sam Harris", "Making Sense", "https://www.youtube.com/@samharrisorg"),
        ("Jordan Peterson", "Jordan B Peterson Podcast", "https://www.youtube.com/@JordanBPeterson"),
        ("Chris Williamson", "Modern Wisdom", "https://www.youtube.com/@ChrisWillx"),
        ("Tom Bilyeu", "Impact Theory", "https://www.youtube.com/@TomBilyeu"),
        ("Steven Bartlett", "Diary of a CEO", "https://www.youtube.com/@TheDiaryOfACEO"),
        ("Peter Attia", "The Drive", "https://www.youtube.com/@PeterAttiaMD"),
        ("Sean Carroll", "Mindscape", "https://www.youtube.com/@seancarroll"),
        ("Tim Ferriss", "The Tim Ferriss Show", "https://www.youtube.com/@timferriss"),
        ("Patrick Bet-David", "PBD Podcast", "https://www.youtube.com/@PBDPodcast"),
        ("Naval Ravikant", "Naval", "https://www.youtube.com/@Navalism"),
        ("Rick Rubin", "Tetragrammaton", "https://www.youtube.com/@TetragrammatonWithRickRubin"),
        ("Konstantin Kisin", "Triggernometry", "https://www.youtube.com/@triggerpod"),
        ("Bari Weiss", "Honestly", "https://www.youtube.com/@BariWeiss"),
        ("Jason Calacanis", "All-In Podcast", "https://www.youtube.com/@allin"),
        ("Shaan Puri", "My First Million", "https://www.youtube.com/@MyFirstMillionPod"),
        ("David Senra", "Founders Podcast", "https://www.youtube.com/@FoundersPodcast"),
        ("Ben Gilbert", "Acquired Podcast", "https://www.youtube.com/@AcquiredPodcast"),
        ("Shawn Ryan", "Shawn Ryan Show", "https://www.youtube.com/@ShawnRyanShowOfficial"),
        ("Mike Ritland", "Mike Drop", "https://www.youtube.com/@MikeDropPodcast"),
        ("Jocko Willink", "Jocko Podcast", "https://www.youtube.com/@JockoPodcastOfficial"),
        ("Ryan Holiday", "Daily Stoic Podcast", "https://www.youtube.com/@DailyStoic"),
        ("Rich Roll", "The Rich Roll Podcast", "https://www.youtube.com/@richroll"),
        ("Aubrey Marcus", "Aubrey Marcus Podcast", "https://www.youtube.com/@AubreyMarcusPod"),
        ("Duncan Trussell", "Duncan Trussell Family Hour", "https://www.youtube.com/@duncantrussell"),
        ("Joey Diaz", "Uncle Joey's Joint", "https://www.youtube.com/@madflavor"),
        ("Bert Kreischer", "Bertcast", "https://www.youtube.com/@bertkreischer"),
        ("Tom Segura", "Your Mom's House", "https://www.youtube.com/@yourmomshousepodcast"),
        ("Andrew Santino", "Whiskey Ginger", "https://www.youtube.com/@AndrewSantinoWhiskeyGinger"),
        ("Bobby Lee", "TigerBelly", "https://www.youtube.com/@TigerBelly"),
        ("Rick Glassman", "Take Your Shoes Off", "https://www.youtube.com/@RickGlassman"),
        ("Whitney Cummings", "Good For You", "https://www.youtube.com/@whitneycummings"),
        ("Marc Maron", "WTF with Marc Maron", "https://www.youtube.com/@WTFPodcast"),
        ("Conan O'Brien", "Conan O'Brien Needs a Friend", "https://www.youtube.com/@TeamCoco"),
        ("Jason Bateman", "SmartLess", "https://www.youtube.com/@SmartLess"),
        ("Andrew Schulz", "Flagrant", "https://www.youtube.com/@FlagrantPod"),
        ("Graham Stephan", "The Iced Coffee Hour", "https://www.youtube.com/@TheIcedCoffeeHour"),
        ("Ali Abdaal", "Deep Dive with Ali Abdaal", "https://www.youtube.com/@aliabdaal"),
        ("Hasan Piker", "Fear & Podcast", "https://www.youtube.com/@fearandpod"),
        ("Steven Bonnell", "Anything Else Podcast", "https://www.youtube.com/@AnythingElsePod"),
        ("Walter Weekes", "FreshFit Podcast", "https://www.youtube.com/@FreshFitPodcast"),
        ("Logan Paul", "Impaulsive", "https://www.youtube.com/@Impaulsive"),
        ("Kyle Forgeard", "Full Send Podcast", "https://www.youtube.com/@FULLSENDPODCAST"),
        ("Adam22", "No Jumper", "https://www.youtube.com/@NoJumper"),
        ("Garry Tan", "Y Combinator Podcast", "https://www.youtube.com/@ycombinator"),
        ("Alastair Campbell", "The Rest Is Politics", "https://www.youtube.com/@therestispolitics"),
        ("Dominic Sandbrook", "The Rest Is History", "https://www.youtube.com/@TheRestIsHistory"),
        ("Megyn Kelly", "The Megyn Kelly Show", "https://www.youtube.com/@MegynKelly"),
        ("Piers Morgan", "Piers Morgan Uncensored", "https://www.youtube.com/@PiersMorganUncensored"),
        ("Ben Shapiro", "The Ben Shapiro Show", "https://www.youtube.com/@BenShapiro"),
        ("Bill Maher", "Club Random", "https://www.youtube.com/@BillMaher"),
        ("Candace Owens", "Candace Owens Podcast", "https://www.youtube.com/@CandaceOwensPodcast"),
        ("Bret Weinstein", "DarkHorse Podcast", "https://www.youtube.com/@BretWeinsteinDarkHorse"),
        ("Douglas Murray", "Douglas Murray", "https://www.youtube.com/@douglasmurrayofficial"),
        ("Lawrence Krauss", "The Origins Podcast", "https://www.youtube.com/@TheOriginsPodcast"),
        ("Michael Shermer", "The Michael Shermer Show", "https://www.youtube.com/@MichaelShermerShow"),
        ("Jim Rutt", "The Jim Rutt Show", "https://www.youtube.com/@JimRuttShow"),
        ("Russ Roberts", "EconTalk", "https://www.youtube.com/@EconTalk"),
        ("Tyler Cowen", "Conversations with Tyler", "https://www.youtube.com/@ConversationswithTyler"),
        ("Shane Parrish", "The Knowledge Project", "https://www.youtube.com/@farnamstreet"),
        ("Ryan Adams", "Bankless Podcast", "https://www.youtube.com/@Bankless"),
        ("Peter McCormack", "What Bitcoin Did", "https://www.youtube.com/@WhatBitcoinDid"),
        ("Anthony Pompliano", "The Pomp Podcast", "https://www.youtube.com/@AnthonyPompliano"),
        ("Raoul Pal", "Real Vision Finance", "https://www.youtube.com/@RealVisionFinance"),
        ("Peter Schiff", "The Peter Schiff Show", "https://www.youtube.com/@peterschiff"),
        ("Dave Ramsey", "The Ramsey Show", "https://www.youtube.com/@TheRamseyShow"),
        ("Lewis Howes", "The School of Greatness", "https://www.youtube.com/@lewishowes"),
        ("Jay Shetty", "On Purpose", "https://www.youtube.com/@JayShettyPodcast"),
        ("Ed Mylett", "The Ed Mylett Show", "https://www.youtube.com/@EdMylettShow"),
        ("Vishen Lakhiani", "The Vishen Lakhiani Podcast", "https://www.youtube.com/@Mindvalley"),
        ("Tim Dillon", "The Tim Dillon Show", "https://www.youtube.com/@thetimdillonshow"),
        ("Shane Gillis", "Matt and Shane's Secret Podcast", "https://www.youtube.com/@MSsecretpodcast"),
        ("Luis J Gomez", "Legion of Skanks", "https://www.youtube.com/@GaSDigital"),
        ("Yannis Pappas", "Long Days with Yannis Pappas", "https://www.youtube.com/@YannisPappas"),
        ("Chris Distefano", "Chrissy Chaos", "https://www.youtube.com/@ChrisDistefanoComedy"),
        ("Ethan Klein", "H3 Podcast", "https://www.youtube.com/@h3podcast"),
        ("Trisha Paytas", "Just Trish", "https://www.youtube.com/@TrishaPaytas"),
        ("Joe Santagato", "The Basement Yard", "https://www.youtube.com/@TheBasementYard"),
        ("Jack Picone", "Almost Friday Podcast", "https://www.youtube.com/@almostfridaypod"),
        ("Danny Jones", "Danny Jones Podcast", "https://www.youtube.com/@DannyJonesPodcast"),
        ("Julian Dorey", "Julian Dorey Podcast", "https://www.youtube.com/@JulianDorey"),
        ("Justin Waller", "Justin Waller Podcast", "https://www.youtube.com/@JWaller7"),
        ("Jordan Harbinger", "The Jordan Harbinger Show", "https://www.youtube.com/@jordanharbinger"),
        ("Adam Carolla", "The Adam Carolla Show", "https://www.youtube.com/@AdamCarolla"),
        ("Russell Brand", "Stay Free", "https://www.youtube.com/@RussellBrand"),
        ("Bill Burr", "Monday Morning Podcast", "https://www.youtube.com/@BillBurrOfficial"),
        ("Theo Von", "Last Weekend", "https://www.youtube.com/@TheoVon"),
        ("Dan Carlin", "Hardcore History", "https://www.youtube.com/@dancarlinpodcasts"),
        ("Guy Raz", "How I Built This", "https://www.youtube.com/@GuyRaz"),
        ("Michael Malice", "YOUR WELCOME", "https://www.youtube.com/@michaelmalice"),
        ("Gad Saad", "The Saad Truth", "https://www.youtube.com/@GadSaad"),
        ("Sargon of Akkad", "The Lotus Eaters", "https://www.youtube.com/@LotusEatersDotCom"),
        ("Glenn Beck", "The Glenn Beck Podcast", "https://www.youtube.com/@glennbeck"),
        ("Dave Rubin", "The Rubin Report", "https://www.youtube.com/@RubinReport"),
        ("Ariel Helwani", "The Ariel Helwani Show", "https://www.youtube.com/@ArielHelwani"),
        ("Ryan Pineda", "The Ryan Pineda Show", "https://www.youtube.com/@RyanPineda"),
        ("Bradley Martyn", "Raw Talk", "https://www.youtube.com/@BradleyMartynOnline"),
        ("George Janko", "The George Janko Show", "https://www.youtube.com/@GeorgeJanko"),
        ("Danny Miranda", "The Danny Miranda Podcast", "https://www.youtube.com/@DannyMiranda"),
        ("Scott Galloway", "The Prof G Show", "https://www.youtube.com/@profgmedia"),
        ("Kara Swisher", "Pivot", "https://www.youtube.com/@vox"),
        ("Sully", "The Sully Show", "https://www.youtube.com/@TheSullyShow"),
        ("Layla Anna-Lee", "The Layla Anna-Lee Show", "https://www.youtube.com/@LaylaAnnaLee"),
        ("David Pakman", "The David Pakman Show", "https://www.youtube.com/@davidpakman"),
        ("Kyle Kulinski", "Secular Talk", "https://www.youtube.com/@seculartalk"),
        ("Cenk Uygur", "The Young Turks", "https://www.youtube.com/@TYT"),
        ("Charlie Kirk", "The Charlie Kirk Show", "https://www.youtube.com/@CharlieKirk"),
        ("Patrick Bet-David", "PBD Podcast", "https://www.youtube.com/@PBDPodcast"),
        ("Valuetainment", "The Vault", "https://www.youtube.com/@ValuetainmentMoney"),
        ("Shawn Stevenson", "The Model Health Show", "https://www.youtube.com/@ShawnStevenson"),
        ("Max Lugavere", "The Genius Life", "https://www.youtube.com/@maxlugavere"),
        ("Layne Norton", "The Biolayne Podcast", "https://www.youtube.com/@biolayne"),
        ("Rhonda Patrick", "FoundMyFitness", "https://www.youtube.com/@foundmyfitness"),
        ("Thomas DeLauer", "The Thomas DeLauer Podcast", "https://www.youtube.com/@ThomasDeLauerOfficial"),
        ("Simon Sinek", "A Bit of Optimism", "https://www.youtube.com/@SimonSinek"),
        ("Brené Brown", "Unlocking Us", "https://www.youtube.com/@BreneBrown"),
        ("Mel Robbins", "The Mel Robbins Podcast", "https://www.youtube.com/@melrobbins"),
        ("Tony Robbins", "The Tony Robbins Podcast", "https://www.youtube.com/@TonyRobbinsLive"),
        ("Dean Graziosi", "The Dean Graziosi Show", "https://www.youtube.com/@deangraziosi"),
        ("Rob Moore", "The Disruptors", "https://www.youtube.com/@robmoore"),
        ("James Altucher", "The James Altucher Show", "https://www.youtube.com/@JamesAltucher"),
        ("Jordan Harbinger", "The Jordan Harbinger Show", "https://www.youtube.com/@jordanharbinger"),
        ("Tom Bilyeu", "Relationship Theory", "https://www.youtube.com/@TomBilyeu"),
        ("Raoul Pal", "Real Vision", "https://www.youtube.com/@RealVisionFinance"),
        ("Lex Bouter", "Integrity Podcast", "https://www.youtube.com/@LexBouter"),
        ("Brian Rose", "London Real", "https://www.youtube.com/@LondonRealTV"),
        ("John Anderson", "Conversations with John Anderson", "https://www.youtube.com/@JohnAndersonDirect"),
        ("Winston Marshall", "The Winston Marshall Show", "https://www.youtube.com/@TheWinstonMarshallShow"),
        ("Andrew Gold", "On the Edge with Andrew Gold", "https://www.youtube.com/@AndrewGoldHeretics"),
        ("Mo Gawdat", "Slo Mo", "https://www.youtube.com/@mogawdatofficial"),
        ("Dr Julie Smith", "The Dr. Julie Podcast", "https://www.youtube.com/@drjulie"),
        ("Sadhguru", "Sadhguru Podcast", "https://www.youtube.com/@sadhguru"),
        ("Wim Hof", "The Wim Hof Podcast", "https://www.youtube.com/@wimhof"),
        ("Joe de Sena", "Spartan Up!", "https://www.youtube.com/@SpartanRace"),
        ("Mark Bell", "Mark Bell's Power Project", "https://www.youtube.com/@MarkBellsPowerProject"),
        ("Greg Doucette", "The Greg Doucette Podcast", "https://www.youtube.com/@gregdoucette"),
        ("Derek", "More Plates More Dates", "https://www.youtube.com/@moreplatesmoredates"),
        ("Tristan Harris", "Your Undivided Attention", "https://www.youtube.com/@CenterForHumaneTech"),
        ("Reid Hoffman", "Masters of Scale", "https://www.youtube.com/@MastersofScale"),
        ("Tim Urban", "The Wait But Why Podcast", "https://www.youtube.com/@waitbutwhy"),
        ("Eric Topol", "Ground Truth", "https://www.youtube.com/@erictopol"),
        ("Zubin Damania", "The ZDoggMD Show", "https://www.youtube.com/@zdoggmd"),
        ("Mark Hyman", "The Doctor's Farmacy", "https://www.youtube.com/@drmarkhyman"),
        ("Robert Lustig", "The Lustig Podcast", "https://www.youtube.com/@robertlustigmd"),
        ("David Sinclair", "Lifespan Podcast", "https://www.youtube.com/@davidsinclair"),
        ("Naveen Jain", "The Moonshot Podcast", "https://www.youtube.com/@NaveenJainOfficial"),
        ("Peter Diamandis", "Moonshots and Mindsets", "https://www.youtube.com/@PeterDiamandis"),
        ("Sal Di Stefano", "Mind Pump Podcast", "https://www.youtube.com/@MindPumpShow"),
        ("Adam Schafer", "Mind Pump", "https://www.youtube.com/@MindPumpShow"),
        ("Justin Andrews", "Mind Pump", "https://www.youtube.com/@MindPumpShow"),
        ("Theo Von", "KATS", "https://www.youtube.com/@TheoVon"),
        ("Erik Griffin", "Riffin with Griffin", "https://www.youtube.com/@ErikGriffin"),
        ("Khalyla Kuhn", "TigerBelly", "https://www.youtube.com/@TigerBelly"),
        ("Annie Lederman", "Trash Tuesday", "https://www.youtube.com/@TrashTuesday"),
        ("Esther Povitsky", "Trash Tuesday", "https://www.youtube.com/@TrashTuesday"),
        ("Stavros Halkias", "Stavy's World", "https://www.youtube.com/@StavrosHalkias"),
        ("Nick Mullen", "The Adam Friedland Show", "https://www.youtube.com/@TheAdamFriedlandShow"),
        ("Adam Friedland", "The Adam Friedland Show", "https://www.youtube.com/@TheAdamFriedlandShow"),
        ("Mark Normand", "We Might Be Drunk", "https://www.youtube.com/@wemightbedrunk"),
        ("Sam Morril", "We Might Be Drunk", "https://www.youtube.com/@wemightbedrunk"),
        ("Taylor Tomlinson", "Sad in the City", "https://www.youtube.com/@TaylorTomlinson"),
        ("Nikki Glaser", "The Nikki Glaser Podcast", "https://www.youtube.com/@TheNikkiGlaserPodcast"),
        ("Heather McDonald", "Juicy Scoop", "https://www.youtube.com/@HeatherMcDonald"),
        ("Jeff Wittek", "Jeff FM", "https://www.youtube.com/@JeffWittek"),
        ("Tana Mongeau", "Cancelled", "https://www.youtube.com/@TanaMongeau"),
        ("Brooke Schofield", "Cancelled", "https://www.youtube.com/@TanaMongeau"),
        ("Bobbi Althoff", "The Really Good Podcast", "https://www.youtube.com/@TheReallyGoodPodcast"),
        ("Caleb Pressley", "Sundae Conversation", "https://www.youtube.com/@barstoolsports"),
        ("Dave Portnoy", "The Dave Portnoy Show", "https://www.youtube.com/@barstoolsports"),
        ("Big Cat", "Pardon My Take", "https://www.youtube.com/@PardonMyTake"),
        ("Pat McAfee", "The Pat McAfee Show", "https://www.youtube.com/@PatMcAfeeShow"),
        ("Rich Eisen", "The Rich Eisen Show", "https://www.youtube.com/@RichEisenShow"),
        ("Dan Patrick", "The Dan Patrick Show", "https://www.youtube.com/@danpatrickshow"),
        ("Bill Simmons", "The Bill Simmons Podcast", "https://www.youtube.com/@TheRinger"),
        ("Ryen Russillo", "The Ryen Russillo Podcast", "https://www.youtube.com/@TheRinger"),
        ("Chris Vernon", "The Mismatch", "https://www.youtube.com/@TheRinger"),
        ("Kevin O'Connor", "The Mismatch", "https://www.youtube.com/@TheRinger"),
        ("Shea Serrano", "The Connect", "https://www.youtube.com/@TheRinger"),
        ("Jason Concepcion", "Binge Mode", "https://www.youtube.com/@TheRinger"),
        ("Mallory Rubin", "Binge Mode", "https://www.youtube.com/@TheRinger"),
        ("Zoe Night", "The Zoe Night Podcast", "https://www.youtube.com/@ZoeNight"),
        ("Mikhaila Peterson", "The Mikhaila Peterson Podcast", "https://www.youtube.com/@MikhailaPeterson"),
        ("Tammy Peterson", "The Tammy Peterson Podcast", "https://www.youtube.com/@TammyPeterson"),
        ("John Delony", "The Dr. John Delony Show", "https://www.youtube.com/@TheRamseyShow"),
        ("Ken Coleman", "The Ken Coleman Show", "https://www.youtube.com/@TheRamseyShow"),
        ("George Kamel", "The George Kamel Show", "https://www.youtube.com/@TheRamseyShow"),
        ("Jade Warshaw", "The Ramsey Show", "https://www.youtube.com/@TheRamseyShow"),
        ("Rachel Cruze", "The Rachel Cruze Show", "https://www.youtube.com/@TheRamseyShow"),
        ("Stephen A Smith", "The Stephen A. Smith Show", "https://www.youtube.com/@StephenASmith"),
        ("Shannon Sharpe", "Club Shay Shay", "https://www.youtube.com/@ClubShayShay"),
        ("Chad Johnson", "Nightcap", "https://www.youtube.com/@NightcapShow"),
        ("Gilbert Arenas", "Gil's Arena", "https://www.youtube.com/@GilsArena"),
        ("Paul George", "Podcast P with Paul George", "https://www.youtube.com/@PodcastPwithPaulGeorge"),
        ("Jay Williams", "The Jay Williams Show", "https://www.youtube.com/@TheJayWilliamsShow"),
        ("JJ Redick", "The Old Man and the Three", "https://www.youtube.com/@JJRedick"),
        ("Draymond Green", "The Draymond Green Show", "https://www.youtube.com/@TheVolume"),
        ("Colin Cowherd", "The Herd", "https://www.youtube.com/@TheVolume"),
        ("Joe Budden", "The Joe Budden Podcast", "https://www.youtube.com/@joebuddenpodcast"),
        ("Andrew Tate", "Tate Speech", "https://www.youtube.com/@TateSpeech"),
        ("Tristan Tate", "Tate Confidential", "https://www.youtube.com/@TateConfidential"),
        ("Sneako", "The Sneako Podcast", "https://www.youtube.com/@sneako"),
        ("Pearl Davis", "The Just Pearly Things Podcast", "https://www.youtube.com/@justpearlythings"),
        ("Rollo Tomassi", "The Rational Male", "https://www.youtube.com/@RolloTomassi"),
        ("Michael Knowles", "The Michael Knowles Show", "https://www.youtube.com/@MichaelKnowles"),
        ("Matt Walsh", "The Matt Walsh Show", "https://www.youtube.com/@MattWalsh"),
        ("Tim Pool", "Timcast IRL", "https://www.youtube.com/@TimcastIRL"),
        ("Charlie Rose", "Charlie Rose Interviews", "https://www.youtube.com/@charlierose"),
        ("Larry King", "Larry King Now", "https://www.youtube.com/@LarryKingNow"),
        ("Jesse Lee Peterson", "The Jesse Lee Peterson Show", "https://www.youtube.com/@JesseLeePeterson"),
        ("Alex Jones", "The Alex Jones Show", "https://www.youtube.com/@InfoWars"),
        ("Tucker Carlson", "The Tucker Carlson Podcast", "https://www.youtube.com/@TuckerCarlson"),
        ("Glenn Greenwald", "System Update", "https://www.youtube.com/@GlennGreenwald"),
        ("Russell Brand", "Under the Skin", "https://www.youtube.com/@RussellBrand"),
        ("Jimmy Dore", "The Jimmy Dore Show", "https://www.youtube.com/@thejimmydoreshow"),
        ("Ana Kasparian", "The Jacobin Show", "https://www.youtube.com/@JacobinMag"),
        ("Chris Hedges", "The Chris Hedges Report", "https://www.youtube.com/@TheRealNews"),
        ("Abby Martin", "Empire Files", "https://www.youtube.com/@EmpireFiles"),
        ("Katie Halper", "The Katie Halper Show", "https://www.youtube.com/@katiehalper"),
        ("Briahna Joy Gray", "Bad Faith", "https://www.youtube.com/@badfaithpodcast"),
        ("Matt Taibbi", "America This Week", "https://www.youtube.com/@mtaibbi"),
        ("Megyn Kelly", "The Megyn Kelly Show", "https://www.youtube.com/@MegynKelly"),
        ("Savannah Hernandez", "Sav Says", "https://www.youtube.com/@savsays"),
        ("Sydney Watson", "The Sydney Watson Show", "https://www.youtube.com/@SydneyWatson"),
        ("Blaire White", "The Blaire White Podcast", "https://www.youtube.com/@msblairewhite"),
        ("Lauren Southern", "The Lauren Southern Show", "https://www.youtube.com/@LaurenSouthernOfficial"),
        ("Vinnie Tortorich", "Fitness Confidential", "https://www.youtube.com/@VinnieTortorich"),
        ("Kelly Starrett", "The Ready State", "https://www.youtube.com/@thereadystate"),
        ("Jill Miller", "Tune Up Fitness", "https://www.youtube.com/@tuneupfitness"),
        ("Ben Greenfield", "The Ben Greenfield Life Podcast", "https://www.youtube.com/@bengreenfieldfitness"),
        ("Dave Asprey", "The Human Upgrade", "https://www.youtube.com/@daveaspreyofficial"),
        ("Luke Storey", "The Life Stylist Podcast", "https://www.youtube.com/@lukestorey"),
        ("Gabby Reece", "The Gabby Reece Show", "https://www.youtube.com/@GabbyReece"),
        ("Laird Hamilton", "The Laird Hamilton Podcast", "https://www.youtube.com/@lairdhamilton"),
        ("Josh Rogin", "The Josh Rogin Podcast", "https://www.youtube.com/@JoshRogin"),
        ("Saagar Enjeti", "Breaking Points", "https://www.youtube.com/@breakingpoints"),
        ("Krystal Ball", "Krystal Kyle & Friends", "https://www.youtube.com/@breakingpoints"),
        ("Kyle Kulinski", "Krystal Kyle & Friends", "https://www.youtube.com/@seculartalk"),
        ("Glenn Loury", "The Glenn Show", "https://www.youtube.com/@GlennLouryShow"),
        ("John McWhorter", "Lexicon Valley", "https://www.youtube.com/@JohnMcWhorter"),
        ("Coleman Hughes", "Conversations with Coleman", "https://www.youtube.com/@colemanhughes"),
        ("Yascha Mounk", "The Persuasion Podcast", "https://www.youtube.com/@YaschaMounk"),
        ("Francis Foster", "Triggernometry", "https://www.youtube.com/@triggerpod"),
        ("Andrew Doyle", "Andrew Doyle Interviews", "https://www.youtube.com/@AndrewDoyleFreeSpeech"),
        ("Brendan O'Neill", "The Brendan O'Neill Show", "https://www.youtube.com/@spikedonline"),
        ("Mick Hume", "The Mick Hume Podcast", "https://www.youtube.com/@spikedonline"),
        ("Spiked Online", "The Spiked Podcast", "https://www.youtube.com/@spikedonline"),
        ("Tom Slater", "The Spiked Podcast", "https://www.youtube.com/@spikedonline"),
        ("Julia Hartley-Brewer", "TalkTV Podcasts", "https://www.youtube.com/@TalkTV"),
        ("Mike Graham", "The Independent Republic", "https://www.youtube.com/@TalkTV"),
        ("Ian Collins", "The Ian Collins Show", "https://www.youtube.com/@TalkTV"),
        ("James Whale", "The James Whale Show", "https://www.youtube.com/@TalkTV"),
        ("Nick Ferrari", "The Nick Ferrari Podcast", "https://www.youtube.com/@LBC"),
        ("James O'Brien", "The Whole Show", "https://www.youtube.com/@LBC"),
        ("Shelagh Fogarty", "Shelagh Fogarty Interviews", "https://www.youtube.com/@LBC"),
        ("Andrew Marr", "Tonight with Andrew Marr", "https://www.youtube.com/@LBC"),
        ("Maajid Nawaz", "The Maajid Nawaz Podcast", "https://www.youtube.com/@MaajidNawaz"),
        ("Iain Dale", "Iain Dale All Talk", "https://www.youtube.com/@LBC"),
        ("Eddie Mair", "The Eddie Mair Podcast", "https://www.youtube.com/@LBC"),
        ("Tom Swarbrick", "Swarbrick on Sunday", "https://www.youtube.com/@LBC"),
        ("Theo Usherwood", "The Theo Usherwood Podcast", "https://www.youtube.com/@LBC"),
        ("Rachel Johnson", "Rachel Johnson's Difficult Women", "https://www.youtube.com/@LBC"),
        ("David Lammy", "The David Lammy Podcast", "https://www.youtube.com/@LBC"),
        ("Ruth Davidson", "Ruth Davidson Interviews", "https://www.youtube.com/@LBC"),
        ("Nick Abbot", "The Nick Abbot Podcast", "https://www.youtube.com/@LBC"),
        ("Steve Allen", "The Steve Allen Podcast", "https://www.youtube.com/@LBC"),
        ("Ferrari", "Ferrari at Breakfast", "https://www.youtube.com/@LBC"),
        ("Matt Frei", "The Matt Frei Podcast", "https://www.youtube.com/@LBC"),
        ("Sangita Myska", "The Sangita Myska Podcast", "https://www.youtube.com/@LBC"),
        ("Ali Miraj", "The Ali Miraj Podcast", "https://www.youtube.com/@LBC"),
        ("Ben Kentish", "The Ben Kentish Podcast", "https://www.youtube.com/@LBC"),
        ("Andrew Castle", "The Andrew Castle Podcast", "https://www.youtube.com/@LBC"),
        ("Paul Brand", "The Paul Brand Podcast", "https://www.youtube.com/@LBC"),
        ("Robert Peston", "The Peston Podcast", "https://www.youtube.com/@ITVNews"),
        ("Tom Bradby", "The Tom Bradby Podcast", "https://www.youtube.com/@ITVNews"),
        ("Julie Etchingham", "The Julie Etchingham Podcast", "https://www.youtube.com/@ITVNews"),
        ("Mary Nightingale", "The Mary Nightingale Podcast", "https://www.youtube.com/@ITVNews"),
        ("Mark Austin", "The Mark Austin Podcast", "https://www.youtube.com/@SkyNews"),
        ("Kay Burley", "The Kay Burley Podcast", "https://www.youtube.com/@SkyNews"),
        ("Beth Rigby", "Beth Rigby Interviews", "https://www.youtube.com/@SkyNews"),
        ("Sophy Ridge", "Sophy Ridge on Sunday", "https://www.youtube.com/@SkyNews"),
        ("Niall Paterson", "The Sky News Daily", "https://www.youtube.com/@SkyNews"),
        ("Ian King", "Ian King Live Podcast", "https://www.youtube.com/@SkyNews"),
        ("Dermot Murnaghan", "The Dermot Murnaghan Podcast", "https://www.youtube.com/@SkyNews"),
        ("Anna Botting", "The Anna Botting Podcast", "https://www.youtube.com/@SkyNews"),
        ("Jayne Secker", "The Jayne Secker Podcast", "https://www.youtube.com/@SkyNews"),
        ("Colin Brazier", "The Colin Brazier Podcast", "https://www.youtube.com/@SkyNews"),
        ("Adam Boulton", "The Adam Boulton Podcast", "https://www.youtube.com/@SkyNews"),
        ("Sarah-Jane Mee", "The Sarah-Jane Mee Podcast", "https://www.youtube.com/@SkyNews"),
        ("Jonathan Samuels", "The Jonathan Samuels Podcast", "https://www.youtube.com/@SkyNews"),
        ("Stephen Dixon", "The Stephen Dixon Podcast", "https://www.youtube.com/@SkyNews"),
        ("Kimberley Leonard", "The Kimberley Leonard Podcast", "https://www.youtube.com/@SkyNews"),
        ("Kamali Melbourne", "The Kamali Melbourne Podcast", "https://www.youtube.com/@SkyNews"),
        ("Gillian Joseph", "The Gillian Joseph Podcast", "https://www.youtube.com/@SkyNews"),
    ("Nate Bargatze", "Nateland Podcast", "https://www.youtube.com/@NateBargatze"),
        ("Neal Brennan", "Blocks with Neal Brennan", "https://www.youtube.com/@nealbrennan"),
        ("Penn Jillette", "Penn's Sunday School", "https://www.youtube.com/@pennsundayschool"),
        ("Kevin Hart", "Gold Minds", "https://www.youtube.com/@LOLNetwork"),
        ("Rainn Wilson", "SoulPancake", "https://www.youtube.com/@soulpancake"),
        ("Mayim Bialik", "Mayim Bialik's Breakdown", "https://www.youtube.com/@mayimbialik"),
        ("Dr. Gabor Maté", "The Gabor Maté Podcast", "https://www.youtube.com/@drgabormate"),
        ("Tara Brach", "Tara Brach Podcast", "https://www.youtube.com/@TaraBrach"),
        ("Jack Kornfield", "Heart Wisdom Podcast", "https://www.youtube.com/@JackKornfield"),
        ("Esther Perel", "Where Should We Begin?", "https://www.youtube.com/@estherperel"),
        ("David Goggins", "The David Goggins Podcast", "https://www.youtube.com/@davidgoggins"),
        ("Cameron Hanes", "Keep Hammering Collective", "https://www.youtube.com/@CameronHanes"),
        ("Andy Stumpf", "Cleared Hot Podcast", "https://www.youtube.com/@ClearedHotPodcast"),
        ("Jack Carr", "Danger Close Podcast", "https://www.youtube.com/@JackCarrUSA"),
        ("Robert Greene", "The Robert Greene Podcast", "https://www.youtube.com/@RobertGreeneOfficial"),
        ("Ryan Serhant", "The Ryan Serhant Show", "https://www.youtube.com/@RyanSerhant"),
        ("Manny Khoshbin", "The Manny Khoshbin Podcast", "https://www.youtube.com/@MannyKhoshbin"),
        ("Grant Cardone", "The Cardone Zone", "https://www.youtube.com/@grantcardone"),
        ("Jordan Belfort", "The Wolf's Den", "https://www.youtube.com/@jordanbelfort"),
        ("Alex Hormozi", "The Game w/ Alex Hormozi", "https://www.youtube.com/@AlexHormozi"),
        ("Leila Hormozi", "Build with Leila Hormozi", "https://www.youtube.com/@LeilaHormozi"),
        ("Iman Gadzhi", "The Iman Gadzhi Podcast", "https://www.youtube.com/@ImanGadzhi"),
        ("Codie Sanchez", "Codie Sanchez Podcast", "https://www.youtube.com/@CodieSanchez"),
        ("Sahil Bloom", "The Curiosity Chronicle", "https://www.youtube.com/@SahilBloom"),
        ("Jack Butcher", "Visualize Value", "https://www.youtube.com/@visualizevalue"),
        ("Pomp", "The Pomp Podcast", "https://www.youtube.com/@AnthonyPompliano"),
        ("Vitalik Buterin", "Vitalik Buterin Talks", "https://www.youtube.com/@VitalikButerin"),
        ("Michael Saylor", "The Saylor Series", "https://www.youtube.com/@michaelsaylor"),
        ("Andreas Antonopoulos", "aantonop", "https://www.youtube.com/@aantonop"),
        ("Cathie Wood", "ARK Invest Podcast", "https://www.youtube.com/@ARKInvest"),
        ("Chamath Palihapitiya", "The Chamath Palihapitiya Podcast", "https://www.youtube.com/@chamath"),
        ("David Sacks", "The David Sacks Podcast", "https://www.youtube.com/@DavidSacks"),
        ("David Friedberg", "The Science of Business", "https://www.youtube.com/@DavidFriedberg"),
        ("Packy McCormick", "Not Boring Podcast", "https://www.youtube.com/@NotBoring"),
        ("Turner Novak", "The Bananaquits Podcast", "https://www.youtube.com/@TurnerNovak"),
        ("Harry Stebbings", "The Twenty Minute VC", "https://www.youtube.com/@20VC"),
        ("Lenny Rachitsky", "Lenny's Podcast", "https://www.youtube.com/@LennysPodcast"),
        ("Tim O'Reilly", "The O'Reilly Podcast", "https://www.youtube.com/@OReillyMedia"),
        ("Benedict Evans", "The Benedict Evans Podcast", "https://www.youtube.com/@BenedictEvans"),
        ("Noam Chomsky", "Chomsky Interviews", "https://www.youtube.com/@NoamChomsky"),
        ("Slavoj Žižek", "Žižek Speeches", "https://www.youtube.com/@SlavojZizek"),
        ("Cornel West", "The Cornel West Podcast", "https://www.youtube.com/@CornelWest"),
        ("Richard Dawkins", "The Poetry of Reality", "https://www.youtube.com/@RichardDawkinsFoundation"),
        ("Michio Kaku", "Exploration", "https://www.youtube.com/@MichioKaku"),
        ("Neil deGrasse Tyson", "StarTalk", "https://www.youtube.com/@StarTalk"),
        ("Bill Nye", "Science Rules!", "https://www.youtube.com/@BillNye"),
        ("Sabine Hossenfelder", "Science without the gobbledygook", "https://www.youtube.com/@SabineHossenfelder"),
        ("Anton Petrov", "The Anton Petrov Podcast", "https://www.youtube.com/@whatdamath"),
        ("Becky Smethurst", "Dr. Becky", "https://www.youtube.com/@DrBecky"),
        ("Katie Mack", "Astrokatie", "https://www.youtube.com/@Astrokatie"),
        ("Sadhguru", "Sadhguru TV", "https://www.youtube.com/@sadhguru"),
        ("Jay Shetty", "On Purpose", "https://www.youtube.com/@JayShettyPodcast"),
        ("Elizabeth Gilbert", "Magic Lessons", "https://www.youtube.com/@ElizabethGilbertAuthor"),
        ("Glennon Doyle", "We Can Do Hard Things", "https://www.youtube.com/@GlennonDoyle"),
        ("Gretchen Rubin", "Happier with Gretchen Rubin", "https://www.youtube.com/@GretchenRubin"),
        ("Marie Forleo", "MarieTV", "https://www.youtube.com/@marieforleo"),
        ("Mel Robbins", "The Mel Robbins Show", "https://www.youtube.com/@melrobbins"),
        ("Vanessa Van Edwards", "Science of People", "https://www.youtube.com/@vvanedwards"),
        ("Simon Sinek", "The Optimism Podcast", "https://www.youtube.com/@SimonSinek"),
        ("Adam Grant", "Rethinking", "https://www.youtube.com/@AdamMGrant"),
        ("Daniel Pink", "The Pinkcast", "https://www.youtube.com/@DanielPink"),
        ("Malcolm Gladwell", "Revisionist History", "https://www.youtube.com/@MalcolmGladwell"),
        ("Seth Godin", "Akimbo", "https://www.youtube.com/@SethGodin"),
        ("Gary Vaynerchuk", "The GaryVee Audio Experience", "https://www.youtube.com/@garyvee"),
        ("Daymond John", "The Daymond John Podcast", "https://www.youtube.com/@DaymondJohn"),
        ("Barbara Corcoran", "Business Unusual", "https://www.youtube.com/@BarbaraCorcoran"),
        ("Robert Herjavec", "The Robert Herjavec Podcast", "https://www.youtube.com/@RobertHerjavec"),
        ("Mark Cuban", "Mark Cuban Interviews", "https://www.youtube.com/@markcuban"),
        ("Lori Greiner", "The Lori Greiner Podcast", "https://www.youtube.com/@LoriGreiner"),
        ("Kevin O'Leary", "The Shark's Podcast", "https://www.youtube.com/@KevinOleary"),
        ("Patrick Bet-David", "Valuetainment", "https://www.youtube.com/@Valuetainment"),
        ("Bedros Keuilian", "The Bedros Keuilian Podcast", "https://www.youtube.com/@bedroskeuilian"),
        ("Wes Watson", "GP Podcast", "https://www.youtube.com/@WesWatson"),
        ("Fresh", "Fresh & Fit", "https://www.youtube.com/@FreshFitPodcast"),
        ("Myron Gaines", "Fresh & Fit", "https://www.youtube.com/@FreshFitPodcast"),
        ("Suleman Hashim", "The Suleman Hashim Podcast", "https://www.youtube.com/@SulemanHashim"),
        ("Zuby", "Real Talk with Zuby", "https://www.youtube.com/@ZubyMusic"),
        ("Candace Owens", "The Candace Owens Show", "https://www.youtube.com/@CandaceOwensPodcast"),
        ("Kandiss Taylor", "The Kandiss Taylor Show", "https://www.youtube.com/@KandissTaylor"),
        ("Steven Crowder", "Louder with Crowder", "https://www.youtube.com/@StevenCrowder"),
        ("Dave Rubin", "The Rubin Report", "https://www.youtube.com/@RubinReport"),
        ("Charlie Kirk", "The Charlie Kirk Show", "https://www.youtube.com/@CharlieKirk"),
        ("Ben Shapiro", "The Daily Wire", "https://www.youtube.com/@BenShapiro"),
        ("Michael Knowles", "The Daily Wire", "https://www.youtube.com/@MichaelKnowles"),
        ("Matt Walsh", "The Daily Wire", "https://www.youtube.com/@MattWalsh"),
        ("Andrew Klavan", "The Andrew Klavan Show", "https://www.youtube.com/@AndrewKlavan"),
        ("Jordan Peterson", "The Jordan B. Peterson Podcast", "https://www.youtube.com/@JordanBPeterson"),
        ("Mikhaila Peterson", "The Mikhaila Peterson Podcast", "https://www.youtube.com/@MikhailaPeterson"),
        ("Gad Saad", "The Saad Truth", "https://www.youtube.com/@GadSaad"),
        ("Douglas Murray", "The Douglas Murray Podcast", "https://www.youtube.com/@douglasmurrayofficial"),
        ("Michael Malice", "YOUR WELCOME", "https://www.youtube.com/@michaelmalice"),
        ("Konstantin Kisin", "Triggernometry", "https://www.youtube.com/@triggerpod"),
        ("Francis Foster", "Triggernometry", "https://www.youtube.com/@triggerpod"),
        ("Andrew Doyle", "Andrew Doyle Podcast", "https://www.youtube.com/@AndrewDoyleFreeSpeech"),
        ("Peter Hitchens", "The Peter Hitchens Podcast", "https://www.youtube.com/@PeterHitchens"),
        ("Christopher Hitchens", "The Hitchens Archive", "https://www.youtube.com/@ChristopherHitchensArchive"),
        ("Sam Harris", "Making Sense Podcast", "https://www.youtube.com/@samharrisorg"),
        ("Eric Weinstein", "The Portal Podcast", "https://www.youtube.com/@EricWeinsteinPhD"),
        ("Bret Weinstein", "DarkHorse Podcast", "https://www.youtube.com/@BretWeinsteinDarkHorse"),
        ("Heather Heying", "DarkHorse Podcast", "https://www.youtube.com/@BretWeinsteinDarkHorse")
    ]

    print(f"Seeding {len(data_to_seed)} Verified Individual Owner Podcasts...")
    for person_name, channel_name, url in data_to_seed:
        cursor.execute("INSERT OR IGNORE INTO people (person_name) VALUES (?)", (person_name,))
        cursor.execute("SELECT person_id FROM people WHERE person_name = ?", (person_name,))
        person_id = cursor.fetchone()[0]

        cursor.execute('''
            INSERT OR IGNORE INTO channels (channel_name, url, channel_owner_id) 
            VALUES (?, ?, ?)
        ''', (channel_name, url, person_id))

    conn.commit()
    conn.close()
    print("Seeding complete.")

def get_channels_by_scrape_priority(limit=10, db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Simple: Lowest numbers have waited the longest
    query = '''
        SELECT c.*, p.person_name as owner 
        FROM channels c
        LEFT JOIN people p ON c.channel_owner_id = p.person_id
        ORDER BY c.scrape_priority ASC
        LIMIT ?
    '''
    cursor.execute(query, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_last_scrape_priority(channel_id):
    conn = sqlite3.connect("youtube_vault.db")
    cursor = conn.cursor()
    
    # 1. Find the current max priority
    cursor.execute("SELECT MAX(scrape_priority) FROM channels")
    current_max = cursor.fetchone()[0] or 0
    
    # 2. Assign this channel MAX + 1 (Sends it to the back of the line)
    cursor.execute('''
        UPDATE channels 
        SET scrape_priority = ?, 
            last_scrape_time = CURRENT_TIMESTAMP 
        WHERE channel_id = ?
    ''', (current_max + 1, channel_id))
    
    conn.commit()
    conn.close()
    # print(f"Channel {channel_id} moved to priority {current_max + 1}")

def update_content_tag_priority(post_id):
    conn = sqlite3.connect("youtube_vault.db")
    cursor = conn.cursor()
    
    # Get the highest number currently in the system
    cursor.execute("SELECT MAX(tag_priority) FROM content")
    res = cursor.fetchone()[0]
    current_max = res if res is not None else 0
    
    # Update this video to max + 1 and update the timestamp
    cursor.execute('''
        UPDATE content 
        SET tag_priority = ?, 
            most_recent_tag = CURRENT_TIMESTAMP 
        WHERE post_id = ?
    ''', (current_max + 1, post_id))
    
    conn.commit()
    conn.close()

def get_content_by_tag_priority(limit=1000, db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row # Allows us to access by column name
    cursor = conn.cursor()
    
    # Grab the lowest priority numbers first
    query = '''
        SELECT post_id, title 
        FROM content 
        ORDER BY tag_priority ASC 
        LIMIT ?
    '''
    cursor.execute(query, (limit,))
    rows = cursor.fetchall()
    
    # Return a list of dicts so we keep the post_id and title together
    videos = [dict(row) for row in rows]
    conn.close()
    return videos

def get_people_by_discovery_priority(limit=100, db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = '''
        SELECT * FROM people 
        ORDER BY discovery_priority ASC 
        LIMIT ?
    '''
    cursor.execute(query, (limit,))
    
    rows = cursor.fetchall()
    people_list = [dict(row) for row in rows]
    conn.close()
    
    return people_list

def update_person_discovery_priority(person_id):
    conn = sqlite3.connect("youtube_vault.db")
    cursor = conn.cursor()
    
    # 1. Find the current max priority in the people table
    cursor.execute("SELECT MAX(discovery_priority) FROM people")
    res = cursor.fetchone()[0]
    current_max = res if res is not None else 0
    
    # 2. Assign this person MAX + 1
    cursor.execute('''
        UPDATE people 
        SET discovery_priority = ?
        WHERE person_id = ?
    ''', (current_max + 1, person_id))
    
    conn.commit()
    conn.close()

def save_video_content(video_list, channel_id, db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    print(f"Saving {len(video_list)} videos to database...")
    for video in video_list:
        video_id = video['url'].split('=')[-1]
        cursor.execute('''
            INSERT OR REPLACE INTO content (post_id, channel_id, title, description, upload_time, crawl_time)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (video_id, channel_id, video['title'], video['description'], video['upload_date'], video['crawl_time']))
    conn.commit()
    conn.close()

def get_people(db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM people")
    rows = cursor.fetchall()
    people_list = [dict(row) for row in rows]
    random.shuffle(people_list)
    conn.close()
    return people_list

def get_people_names(db_name="youtube_vault.db"):
    people_data = get_people(db_name)
    return [person['person_name'] for person in people_data]

def insert_new_channel(channel_name, url, channel_owner_id=None, db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR IGNORE INTO channels (channel_name, url, channel_owner_id) 
        VALUES (?, ?, ?)
    ''', (channel_name, url, channel_owner_id))
    new_id = cursor.lastrowid
    conn.commit()
    if new_id == 0:
        cursor.execute("SELECT channel_id FROM channels WHERE url = ?", (url,))
        existing = cursor.fetchone()
        new_id = existing[0] if existing else None
    else:
        print(f"Successfully added new channel: {channel_name}")
    conn.close()
    return new_id

def get_total_channels(db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM channels")
    count = cursor.fetchone()[0]
    conn.close()
    return count



def tag_people_in_video(post_id, people_names, db_name="youtube_vault.db"):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    # Logic change: Search by post_id, not title
    cursor.execute("SELECT post_id FROM content WHERE post_id = ?", (post_id,))
    result = cursor.fetchone()
    
    if not result:
        print(f"FAILED: Video ID '{post_id}' not found in database.")
        conn.close()
        return False

    for name in people_names:
        cursor.execute("INSERT OR IGNORE INTO people (person_name) VALUES (?)", (name,))
        cursor.execute("SELECT person_id FROM people WHERE person_name = ?", (name,))
        person_id = cursor.fetchone()[0]
        
        cursor.execute('''
            INSERT OR IGNORE INTO people_in_content (post_id, person_id)
            VALUES (?, ?)
        ''', (post_id, person_id))
        
    conn.commit()
    conn.close()
    return True

def display_all_posts(db_name="youtube_vault.db", limit=10):
    """Queries and prints post data joined with channel information."""
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # We use a JOIN to get the Channel Name and Owner Name instead of just IDs
    query = f'''
        SELECT 
            c.post_id, 
            p.person_name AS owner,
            ch.channel_name, 
            c.title, 
            c.upload_time
        FROM content c
        JOIN channels ch ON c.channel_id = ch.channel_id
        JOIN people p ON ch.channel_owner_id = p.person_id
        LIMIT {limit}
    '''
    
    cursor.execute(query)
    rows = cursor.fetchall()

    print("\n--- YOUTUBE VAULT POST DATA ---")
    print(f"{'ID':<10} | {'OWNER':<15} | {'CHANNEL':<25} | {'TITLE'}")
    print("-" * 80)
    
    for row in rows:
        print(f"{row[0]:<10} | {row[1]:<15} | {row[2]:<25} | {row[3]}")

    conn.close()

if __name__ == "__main__":
    init_db()
    seed_data()

    # display_all_posts(db_name="youtube_vault.db", limit=10)
    exit()
