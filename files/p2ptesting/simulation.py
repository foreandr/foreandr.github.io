import subprocess, time, os, shutil
from config import NUM_HONEST, START_PORT, get_all_ports

LOG_DIR = "logs"
PEER_FILE = "peers.txt"

def run_sim():
    if os.path.exists(LOG_DIR): shutil.rmtree(LOG_DIR)
    os.makedirs(LOG_DIR)
    
    # Wipe the peer file to start fresh
    with open(PEER_FILE, "w") as f: f.write("")
    
    all_ports = get_all_ports()
    processes = []
    print(f"--- STARTING {len(all_ports)} NODES WITH HARDCODED PORTS ---")

    for i, port in enumerate(all_ports):
        mode = "--malicious" if port == max(all_ports) else "--auto"
        # We pass the index 'i' so the node knows exactly which port to take
        f = open(f"{LOG_DIR}/node_{port}.log", "w", encoding="utf-8")
        p = subprocess.Popen(["python", "-u", "main.py", mode, str(i)], stdout=f, stderr=f)
        processes.append((p, f))

    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        for p, f in processes:
            p.terminate()
            f.close()

if __name__ == "__main__":
    run_sim()