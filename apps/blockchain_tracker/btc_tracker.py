import requests
import pandas as pd
import time
import json
import os
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "https://mempool.space/api"
STATE_FILE = "mempool_tracker_state.json"
CSV_FILE = "bitcoin_mempool_evolution.csv"
THREADS = 20  # Number of parallel block fetches

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"last_block": 0}

def save_state(block_height):
    with open(STATE_FILE, 'w') as f:
        json.dump({"last_block": block_height}, f)

def get_current_tip():
    try:
        res = requests.get(f"{BASE_URL}/blocks/tip/height", timeout=10)
        return int(res.text)
    except Exception as e:
        print(f"⚠️ Error getting tip: {e}")
        return 0

def get_block_data(height):
    """Fetches block details and all transactions within that block."""
    try:
        # 1. Get block hash
        hash_res = requests.get(f"{BASE_URL}/block-height/{height}", timeout=10)
        block_hash = hash_res.text
        
        # 2. Get block header info
        block_res = requests.get(f"{BASE_URL}/block/{block_hash}", timeout=10).json()
        
        # 3. Get transactions (Note: mempool.space limits to 25 txs per request for this endpoint, 
        # but for early blocks like 13k it's fine. For modern blocks, logic would need pagination)
        txs_res = requests.get(f"{BASE_URL}/block/{block_hash}/txs", timeout=10).json()
        
        block_time = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(block_res['timestamp']))

        block_data = []
        for tx in txs_res:
            is_coinbase = tx['vin'][0].get('is_coinbase', False)
            
            if not is_coinbase:
                prevout = tx['vin'][0].get('prevout')
                sender = prevout.get('scriptpubkey_address', 'P2PK/Unknown') if prevout else "Unknown"
                potential_receivers = [out.get('scriptpubkey_address', 'P2PK/Unknown') for out in tx['vout']]
                # Simple logic: first receiver that isn't the sender (to avoid change addresses)
                receiver = next((r for r in potential_receivers if r != sender), potential_receivers[0])
                tx_type = "P2P Transfer"
            else:
                sender = "COINBASE"
                receiver = tx['vout'][0].get('scriptpubkey_address', 'P2PK/Unknown')
                tx_type = "Mining Reward"

            block_data.append({
                "Block": height,
                "Timestamp": block_time,
                "Type": tx_type,
                "Amount_BTC": sum(out['value'] for out in tx['vout']) / 100_000_000,
                "Sender": sender,
                "Receiver": receiver,
                "TX_Hash": tx['txid']
            })
        return block_data, height

    except Exception as e:
        print(f"⚠️ Error fetching block {height}: {e}")
        return None, height

def main():
    state = load_state()
    current_block = state["last_block"] + 1 # Start from the NEXT block

    print(f"--- 🚀 STARTING TRACKER AT BLOCK {current_block} ---")

    while True:
        try:
            tip_height = get_current_tip()
            
            if current_block > tip_height:
                print("💤 Caught up to tip. Waiting 60s...")
                time.sleep(60)
                continue

            # Process in chunks to keep threading efficient but orderly
            end_block = min(current_block + THREADS, tip_height + 1)
            blocks_to_fetch = list(range(current_block, end_block))

            with ThreadPoolExecutor(max_workers=THREADS) as executor:
                # Map ensures we get results back, but we will iterate carefully
                future_to_block = {executor.submit(get_block_data, h): h for h in blocks_to_fetch}
                
                # IMPORTANT: We iterate through blocks_to_fetch to maintain order in the CSV
                # even if threads finish at different times.
                results = []
                for f in blocks_to_fetch:
                    # Find the future associated with this specific height
                    for future, height in future_to_block.items():
                        if height == f:
                            block_data, h = future.result()
                            if block_data:
                                df = pd.DataFrame(block_data)
                                # Append to CSV. Only write header if file doesn't exist.
                                df.to_csv(CSV_FILE, mode='a', index=False, header=not os.path.exists(CSV_FILE))
                                save_state(h)
                                print(f"✅ Block {h} logged ({len(block_data)} txs).")
                                current_block = h + 1
                            break

        except KeyboardInterrupt:
            print("\n🛑 Process stopped by user.")
            break
        except Exception as e:
            print(f"⚠️ Main loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    # main()
    def trim_csv_to_march_2011(filename="bitcoin_mempool_evolution.csv"):
        # Load the data
        df = pd.read_csv(filename)
        
        # Convert Timestamp column to datetime objects
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])
        
        # Keep only rows where the date is on or before March 31, 2011
        # This filters out anything from April 1, 2011 onwards
        filtered_df = df[df['Timestamp'] <= '2011-03-31 23:59:59']
        
        # Overwrite the original file with the trimmed data
        filtered_df.to_csv(filename, index=False)
        
        print(f"Done! All data after March 2011 has been removed from {filename}.")
        
    trim_csv_to_march_2011(filename="bitcoin_mempool_evolution.csv")